"""
PyTorch Neural Network Training Service
Provides training, prediction, and evaluation for deep learning models
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, TensorDataset
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from typing import Dict, Any, List, Tuple, Optional
import json
from pathlib import Path
import time

class NeuralNetworkDataset(Dataset):
    """Custom dataset for neural networks"""
    def __init__(self, X, y):
        self.X = torch.FloatTensor(X)
        self.y = torch.FloatTensor(y) if len(y.shape) > 1 else torch.LongTensor(y)
    
    def __len__(self):
        return len(self.X)
    
    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

class MLP(nn.Module):
    """Multi-Layer Perceptron"""
    def __init__(self, input_size: int, hidden_layers: List[int], output_size: int, 
                 activation: str = "relu", dropout: float = 0.2):
        super(MLP, self).__init__()
        
        # Activation functions
        activations = {
            "relu": nn.ReLU(),
            "leaky_relu": nn.LeakyReLU(),
            "sigmoid": nn.Sigmoid(),
            "tanh": nn.Tanh(),
            "gelu": nn.GELU()
        }
        
        self.activation = activations.get(activation, nn.ReLU())
        
        # Build layers
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_layers:
            layers.append(nn.Linear(prev_size, hidden_size))
            layers.append(self.activation)
            layers.append(nn.Dropout(dropout))
            prev_size = hidden_size
        
        # Output layer
        layers.append(nn.Linear(prev_size, output_size))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)

class PyTorchModelTrainer:
    """Handles training and evaluation of PyTorch models"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.is_classification = True
        self.feature_names = []
        self.target_name = ""
        self.training_history = {
            "train_loss": [],
            "val_loss": [],
            "train_acc": [],
            "val_acc": []
        }
        self.models_dir = Path("models")
        self.models_dir.mkdir(exist_ok=True)
    
    def prepare_data(self, df: pd.DataFrame, target_column: str, test_size: float = 0.2, 
                    batch_size: int = 32):
        """Prepare data for training"""
        # Separate features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        self.feature_names = X.columns.tolist()
        self.target_name = target_column
        
        # Handle categorical features
        X_encoded = pd.get_dummies(X, drop_first=True)
        self.feature_names = X_encoded.columns.tolist()
        
        # Determine task type
        self.is_classification = y.dtype == 'object' or len(y.unique()) < 20
        
        # Encode target if classification
        if self.is_classification and y.dtype == 'object':
            y = self.label_encoder.fit_transform(y)
            self.n_classes = len(self.label_encoder.classes_)
        elif self.is_classification:
            self.n_classes = len(y.unique())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y, test_size=test_size, random_state=42
        )
        
        # Further split training into train and validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_train, y_train, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Convert to numpy arrays
        y_train = y_train.values if isinstance(y_train, pd.Series) else y_train
        y_val = y_val.values if isinstance(y_val, pd.Series) else y_val
        y_test = y_test.values if isinstance(y_test, pd.Series) else y_test
        
        # Create datasets
        train_dataset = NeuralNetworkDataset(X_train_scaled, y_train)
        val_dataset = NeuralNetworkDataset(X_val_scaled, y_val)
        test_dataset = NeuralNetworkDataset(X_test_scaled, y_test)
        
        # Create dataloaders
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
        test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
        
        self.input_size = X_train_scaled.shape[1]
        self.X_test = X_test_scaled
        self.y_test = y_test
        
        return train_loader, val_loader, test_loader
    
    def create_model(self, architecture: str, hidden_layers: int = 3, 
                    neurons_per_layer: int = 128, activation: str = "relu"):
        """Create neural network model"""
        
        if architecture == "mlp":
            # Create hidden layer sizes
            hidden_sizes = [neurons_per_layer] * hidden_layers
            
            # Determine output size
            output_size = self.n_classes if self.is_classification else 1
            
            self.model = MLP(
                input_size=self.input_size,
                hidden_layers=hidden_sizes,
                output_size=output_size,
                activation=activation
            )
        else:
            # For now, only MLP is implemented
            # Can add CNN, RNN, LSTM, Transformer later
            raise NotImplementedError(f"Architecture {architecture} not yet implemented")
        
        self.model = self.model.to(self.device)
        return self.model
    
    def train(
        self,
        df: pd.DataFrame,
        target_column: str,
        architecture: str = "mlp",
        hidden_layers: int = 3,
        neurons_per_layer: int = 128,
        activation: str = "relu",
        optimizer_name: str = "adam",
        learning_rate: float = 0.001,
        epochs: int = 50,
        batch_size: int = 32,
        loss_function: str = "cross_entropy",
        test_size: float = 0.2
    ) -> Dict[str, Any]:
        """Train a PyTorch model"""
        
        # Prepare data
        train_loader, val_loader, test_loader = self.prepare_data(
            df, target_column, test_size, batch_size
        )
        
        # Create model
        self.create_model(architecture, hidden_layers, neurons_per_layer, activation)
        
        # Loss function
        if self.is_classification:
            if loss_function == "cross_entropy":
                criterion = nn.CrossEntropyLoss()
            elif loss_function == "bce":
                criterion = nn.BCEWithLogitsLoss()
            else:
                criterion = nn.CrossEntropyLoss()
        else:
            if loss_function == "mse":
                criterion = nn.MSELoss()
            elif loss_function == "mae":
                criterion = nn.L1Loss()
            else:
                criterion = nn.MSELoss()
        
        # Optimizer
        optimizers = {
            "adam": optim.Adam(self.model.parameters(), lr=learning_rate),
            "sgd": optim.SGD(self.model.parameters(), lr=learning_rate, momentum=0.9),
            "adamw": optim.AdamW(self.model.parameters(), lr=learning_rate),
            "rmsprop": optim.RMSprop(self.model.parameters(), lr=learning_rate)
        }
        optimizer = optimizers.get(optimizer_name, optim.Adam(self.model.parameters(), lr=learning_rate))
        
        # Training loop
        self.training_history = {
            "train_loss": [],
            "val_loss": [],
            "train_acc": [],
            "val_acc": [],
            "epochs": []
        }
        
        start_time = time.time()
        
        for epoch in range(epochs):
            # Training phase
            train_loss, train_acc = self._train_epoch(train_loader, criterion, optimizer)
            
            # Validation phase
            val_loss, val_acc = self._validate_epoch(val_loader, criterion)
            
            # Store history
            self.training_history["train_loss"].append(float(train_loss))
            self.training_history["val_loss"].append(float(val_loss))
            self.training_history["train_acc"].append(float(train_acc))
            self.training_history["val_acc"].append(float(val_acc))
            self.training_history["epochs"].append(epoch + 1)
            
            # Print progress every 10 epochs
            if (epoch + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{epochs}] - "
                      f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
                      f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
        
        training_time = time.time() - start_time
        
        # Test evaluation
        test_metrics = self._evaluate_test_set(test_loader, criterion)
        
        # Compile results
        results = {
            "training_history": self.training_history,
            "test_metrics": test_metrics,
            "training_time": training_time,
            "total_epochs": epochs,
            "model_parameters": sum(p.numel() for p in self.model.parameters()),
            "device": str(self.device)
        }
        
        return results
    
    def _train_epoch(self, train_loader, criterion, optimizer):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(self.device), targets.to(self.device)
            
            # Forward pass
            outputs = self.model(inputs)
            
            if self.is_classification:
                loss = criterion(outputs, targets)
                _, predicted = torch.max(outputs.data, 1)
                correct += (predicted == targets).sum().item()
            else:
                loss = criterion(outputs.squeeze(), targets.float())
            
            total += targets.size(0)
            total_loss += loss.item()
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        
        avg_loss = total_loss / len(train_loader)
        accuracy = correct / total if self.is_classification else 0
        
        return avg_loss, accuracy
    
    def _validate_epoch(self, val_loader, criterion):
        """Validate for one epoch"""
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(self.device), targets.to(self.device)
                
                outputs = self.model(inputs)
                
                if self.is_classification:
                    loss = criterion(outputs, targets)
                    _, predicted = torch.max(outputs.data, 1)
                    correct += (predicted == targets).sum().item()
                else:
                    loss = criterion(outputs.squeeze(), targets.float())
                
                total += targets.size(0)
                total_loss += loss.item()
        
        avg_loss = total_loss / len(val_loader)
        accuracy = correct / total if self.is_classification else 0
        
        return avg_loss, accuracy
    
    def _evaluate_test_set(self, test_loader, criterion):
        """Evaluate on test set"""
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        all_predictions = []
        all_targets = []
        
        with torch.no_grad():
            for inputs, targets in test_loader:
                inputs, targets = inputs.to(self.device), targets.to(self.device)
                
                outputs = self.model(inputs)
                
                if self.is_classification:
                    loss = criterion(outputs, targets)
                    _, predicted = torch.max(outputs.data, 1)
                    correct += (predicted == targets).sum().item()
                    all_predictions.extend(predicted.cpu().numpy())
                else:
                    loss = criterion(outputs.squeeze(), targets.float())
                    all_predictions.extend(outputs.squeeze().cpu().numpy())
                
                all_targets.extend(targets.cpu().numpy())
                total += targets.size(0)
                total_loss += loss.item()
        
        avg_loss = total_loss / len(test_loader)
        
        metrics = {
            "test_loss": float(avg_loss),
        }
        
        if self.is_classification:
            accuracy = correct / total
            metrics["test_accuracy"] = float(accuracy)
            
            # Calculate confusion matrix
            from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score
            cm = confusion_matrix(all_targets, all_predictions)
            metrics["confusion_matrix"] = cm.tolist()
            metrics["precision"] = float(precision_score(all_targets, all_predictions, average='weighted', zero_division=0))
            metrics["recall"] = float(recall_score(all_targets, all_predictions, average='weighted', zero_division=0))
            metrics["f1_score"] = float(f1_score(all_targets, all_predictions, average='weighted', zero_division=0))
        else:
            from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
            metrics["test_mse"] = float(mean_squared_error(all_targets, all_predictions))
            metrics["test_rmse"] = float(np.sqrt(metrics["test_mse"]))
            metrics["test_mae"] = float(mean_absolute_error(all_targets, all_predictions))
            metrics["test_r2"] = float(r2_score(all_targets, all_predictions))
        
        return metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        self.model.eval()
        X_scaled = self.scaler.transform(X)
        X_tensor = torch.FloatTensor(X_scaled).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(X_tensor)
            
            if self.is_classification:
                _, predictions = torch.max(outputs, 1)
                return predictions.cpu().numpy()
            else:
                return outputs.squeeze().cpu().numpy()
    
    def get_predictions_sample(self, n_samples: int = 10) -> Dict[str, Any]:
        """Get sample predictions from test set"""
        print(f"DEBUG PyTorch get_predictions_sample: hasattr X_test={hasattr(self, 'X_test')}, hasattr y_test={hasattr(self, 'y_test')}")
        
        if not hasattr(self, 'X_test') or not hasattr(self, 'y_test'):
            print("DEBUG PyTorch: No X_test o y_test disponible")
            return {"predictions": []}
        
        if self.X_test is None or self.y_test is None:
            print("DEBUG PyTorch: X_test o y_test es None")
            return {"predictions": []}
        
        if len(self.X_test) == 0 or len(self.y_test) == 0:
            print("DEBUG PyTorch: X_test o y_test está vacío")
            return {"predictions": []}
        
        print(f"DEBUG PyTorch: X_test shape={self.X_test.shape}, y_test shape={self.y_test.shape}")
        
        n_samples = min(n_samples, len(self.X_test))
        X_sample = self.X_test[:n_samples]
        y_true = self.y_test[:n_samples]
        
        print(f"DEBUG PyTorch: Generando {n_samples} predicciones")
        
        # X_test is already scaled, so convert directly to tensor
        self.model.eval()
        X_tensor = torch.FloatTensor(X_sample).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(X_tensor)
            
            if self.is_classification:
                predictions = torch.argmax(outputs, dim=1).cpu().numpy()
            else:
                predictions = outputs.squeeze().cpu().numpy()
        
        results = []
        for i in range(n_samples):
            pred_data = {
                "sample_id": i + 1,
                "true_value": float(y_true.iloc[i]) if hasattr(y_true, 'iloc') else (float(y_true[i]) if not self.is_classification else int(y_true[i])),
                "predicted_value": float(predictions[i]) if not self.is_classification else int(predictions[i])
            }
            
            # Add confidence for classification
            if self.is_classification:
                with torch.no_grad():
                    output = outputs[i:i+1]
                    probs = torch.softmax(output, dim=1).cpu().numpy()[0]
                    pred_data["confidence"] = float(np.max(probs))
                    pred_data["probabilities"] = probs.tolist()
            
            results.append(pred_data)
        
        print(f"DEBUG PyTorch: Generadas {len(results)} predicciones")
        return {"predictions": results}
    
    def save_model(self, model_name: str) -> str:
        """Save trained model"""
        if self.model is None:
            raise ValueError("No model to save")
        
        model_path = self.models_dir / f"{model_name}_pytorch.pth"
        scaler_path = self.models_dir / f"{model_name}_scaler_pytorch.pkl"
        
        # Save model state
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'model_architecture': self.model.__class__.__name__,
        }, model_path)
        
        # Save scaler
        import joblib
        joblib.dump(self.scaler, scaler_path)
        
        # Save metadata
        metadata = {
            "feature_names": self.feature_names,
            "target_name": self.target_name,
            "is_classification": self.is_classification,
            "input_size": self.input_size,
            "training_history": self.training_history
        }
        
        metadata_path = self.models_dir / f"{model_name}_metadata_pytorch.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
        
        return str(model_path)
