"""
Scikit-learn ML Training Service
Provides training, prediction, and evaluation for traditional ML models
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    confusion_matrix, roc_curve, roc_auc_score, classification_report,
    mean_squared_error, r2_score, mean_absolute_error
)
import joblib
from typing import Dict, Any, Tuple, Optional
import json
from pathlib import Path

class SklearnModelTrainer:
    """Handles training and evaluation of scikit-learn models"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.is_classification = True
        self.feature_names = []
        self.target_name = ""
        self.models_dir = Path("models")
        self.models_dir.mkdir(exist_ok=True)
        
    def get_model(self, model_type: str, task_type: str = "classification"):
        """Get the appropriate model based on type and task"""
        models = {
            "classification": {
                "logistic": LogisticRegression(max_iter=1000, random_state=42),
                "rf": RandomForestClassifier(n_estimators=100, random_state=42),
                "gb": GradientBoostingClassifier(n_estimators=100, random_state=42),
                "svm": SVC(probability=True, random_state=42),
                "knn": KNeighborsClassifier(n_neighbors=5)
            },
            "regression": {
                "linear": LinearRegression(),
                "rf": RandomForestRegressor(n_estimators=100, random_state=42),
                "gb": GradientBoostingRegressor(n_estimators=100, random_state=42),
                "svm": SVR(),
                "knn": KNeighborsRegressor(n_neighbors=5)
            }
        }
        
        self.is_classification = (task_type == "classification")
        return models[task_type].get(model_type)
    
    def prepare_data(self, df: pd.DataFrame, target_column: str, test_size: float = 0.2):
        """Prepare data for training"""
        # Separate features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        self.feature_names = X.columns.tolist()
        self.target_name = target_column
        
        # Handle categorical features
        X_encoded = pd.get_dummies(X, drop_first=True)
        self.feature_names = X_encoded.columns.tolist()
        
        # Encode target if classification
        if self.is_classification and y.dtype == 'object':
            y = self.label_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y, test_size=test_size, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        return X_train_scaled, X_test_scaled, y_train, y_test
    
    def train(
        self, 
        df: pd.DataFrame, 
        target_column: str,
        model_type: str,
        task_type: str = "classification",
        test_size: float = 0.2,
        cv_folds: int = 5,
        optimize_hyperparams: Optional[str] = None
    ) -> Dict[str, Any]:
        """Train a scikit-learn model"""
        
        # Prepare data
        X_train, X_test, y_train, y_test = self.prepare_data(df, target_column, test_size)
        
        # Get model
        self.model = self.get_model(model_type, task_type)
        
        # Hyperparameter optimization
        if optimize_hyperparams and optimize_hyperparams != "none":
            self.model = self._optimize_hyperparameters(
                self.model, X_train, y_train, optimize_hyperparams, model_type
            )
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train, y_train, cv=cv_folds)
        
        # Predictions
        y_pred_train = self.model.predict(X_train)
        y_pred_test = self.model.predict(X_test)
        
        # Calculate metrics
        if self.is_classification:
            metrics = self._calculate_classification_metrics(
                y_train, y_pred_train, y_test, y_pred_test, X_test
            )
        else:
            metrics = self._calculate_regression_metrics(
                y_train, y_pred_train, y_test, y_pred_test
            )
        
        # Add cross-validation scores
        metrics["cv_scores"] = cv_scores.tolist()
        metrics["cv_mean"] = float(cv_scores.mean())
        metrics["cv_std"] = float(cv_scores.std())
        
        # Feature importance (if available)
        if hasattr(self.model, 'feature_importances_'):
            importance = self.model.feature_importances_
            metrics["feature_importance"] = [
                {"feature": name, "importance": float(imp)}
                for name, imp in zip(self.feature_names, importance)
            ]
            metrics["feature_importance"].sort(key=lambda x: x["importance"], reverse=True)
        
        # Store test data for predictions
        self.X_test = X_test
        self.y_test = y_test
        
        return metrics
    
    def _optimize_hyperparameters(self, model, X_train, y_train, method: str, model_type: str):
        """Optimize model hyperparameters"""
        param_grids = {
            "rf": {
                "n_estimators": [50, 100, 200],
                "max_depth": [None, 10, 20, 30],
                "min_samples_split": [2, 5, 10]
            },
            "gb": {
                "n_estimators": [50, 100, 200],
                "learning_rate": [0.01, 0.1, 0.2],
                "max_depth": [3, 5, 7]
            },
            "svm": {
                "C": [0.1, 1, 10],
                "kernel": ["rbf", "linear"],
                "gamma": ["scale", "auto"]
            },
            "knn": {
                "n_neighbors": [3, 5, 7, 9],
                "weights": ["uniform", "distance"]
            }
        }
        
        param_grid = param_grids.get(model_type, {})
        
        if not param_grid:
            return model
        
        if method == "grid":
            search = GridSearchCV(model, param_grid, cv=3, n_jobs=-1)
        elif method == "random":
            search = RandomizedSearchCV(model, param_grid, n_iter=10, cv=3, n_jobs=-1, random_state=42)
        else:
            return model
        
        search.fit(X_train, y_train)
        return search.best_estimator_
    
    def _calculate_classification_metrics(self, y_train, y_pred_train, y_test, y_pred_test, X_test):
        """Calculate classification metrics"""
        metrics = {}
        
        # Training metrics
        metrics["train_accuracy"] = float(accuracy_score(y_train, y_pred_train))
        
        # Test metrics
        metrics["test_accuracy"] = float(accuracy_score(y_test, y_pred_test))
        metrics["precision"] = float(precision_score(y_test, y_pred_test, average='weighted', zero_division=0))
        metrics["recall"] = float(recall_score(y_test, y_pred_test, average='weighted', zero_division=0))
        metrics["f1_score"] = float(f1_score(y_test, y_pred_test, average='weighted', zero_division=0))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred_test)
        metrics["confusion_matrix"] = cm.tolist()
        
        # ROC curve and AUC (for binary classification)
        try:
            if len(np.unique(y_test)) == 2:
                y_proba = self.model.predict_proba(X_test)[:, 1]
                fpr, tpr, thresholds = roc_curve(y_test, y_proba)
                metrics["roc_curve"] = {
                    "fpr": fpr.tolist(),
                    "tpr": tpr.tolist(),
                    "thresholds": thresholds.tolist()
                }
                metrics["auc_score"] = float(roc_auc_score(y_test, y_proba))
        except Exception as e:
            print(f"Could not calculate ROC curve: {e}")
        
        return metrics
    
    def _calculate_regression_metrics(self, y_train, y_pred_train, y_test, y_pred_test):
        """Calculate regression metrics"""
        metrics = {}
        
        # Training metrics
        metrics["train_mse"] = float(mean_squared_error(y_train, y_pred_train))
        metrics["train_r2"] = float(r2_score(y_train, y_pred_train))
        
        # Test metrics
        metrics["test_mse"] = float(mean_squared_error(y_test, y_pred_test))
        metrics["test_mae"] = float(mean_absolute_error(y_test, y_pred_test))
        metrics["test_rmse"] = float(np.sqrt(metrics["test_mse"]))
        metrics["test_r2"] = float(r2_score(y_test, y_pred_test))
        
        return metrics
    
    def predict(self, X: np.ndarray, return_proba: bool = False) -> np.ndarray:
        """Make predictions"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        X_scaled = self.scaler.transform(X)
        
        if return_proba and self.is_classification and hasattr(self.model, 'predict_proba'):
            return self.model.predict_proba(X_scaled)
        
        return self.model.predict(X_scaled)
    
    def get_predictions_sample(self, n_samples: int = 10) -> Dict[str, Any]:
        """Get sample predictions from test set"""
        if not hasattr(self, 'X_test') or not hasattr(self, 'y_test'):
            return {"predictions": []}
        
        n_samples = min(n_samples, len(self.X_test))
        X_sample = self.X_test[:n_samples]
        y_true = self.y_test[:n_samples]
        
        predictions = self.predict(X_sample)
        
        results = []
        for i in range(n_samples):
            pred_data = {
                "sample_id": i + 1,
                "true_value": float(y_true[i]) if not self.is_classification else int(y_true[i]),
                "predicted_value": float(predictions[i]) if not self.is_classification else int(predictions[i])
            }
            
            # Add probability for classification
            if self.is_classification and hasattr(self.model, 'predict_proba'):
                proba = self.model.predict_proba(X_sample[i:i+1])[0]
                pred_data["confidence"] = float(np.max(proba))
                pred_data["probabilities"] = proba.tolist()
            
            results.append(pred_data)
        
        return {"predictions": results}
    
    def save_model(self, model_name: str) -> str:
        """Save trained model"""
        if self.model is None:
            raise ValueError("No model to save")
        
        model_path = self.models_dir / f"{model_name}.joblib"
        scaler_path = self.models_dir / f"{model_name}_scaler.joblib"
        
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        
        # Save metadata
        metadata = {
            "feature_names": self.feature_names,
            "target_name": self.target_name,
            "is_classification": self.is_classification
        }
        
        metadata_path = self.models_dir / f"{model_name}_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
        
        return str(model_path)
    
    def load_model(self, model_name: str):
        """Load a saved model"""
        model_path = self.models_dir / f"{model_name}.joblib"
        scaler_path = self.models_dir / f"{model_name}_scaler.joblib"
        metadata_path = self.models_dir / f"{model_name}_metadata.json"
        
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            self.feature_names = metadata["feature_names"]
            self.target_name = metadata["target_name"]
            self.is_classification = metadata["is_classification"]
