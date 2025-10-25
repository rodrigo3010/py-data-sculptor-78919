"""
Visualization Service
Generates statistical plots and charts for ML results
"""

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from pathlib import Path
import base64
from io import BytesIO
from typing import Dict, Any, List, Optional

class VisualizationService:
    """Handles generation of statistical plots and visualizations"""
    
    def __init__(self):
        self.plots_dir = Path("static/plots")
        self.plots_dir.mkdir(parents=True, exist_ok=True)
        
        # Set style
        sns.set_style("whitegrid")
        plt.rcParams['figure.figsize'] = (10, 6)
        plt.rcParams['font.size'] = 10
    
    def _fig_to_base64(self, fig) -> str:
        """Convert matplotlib figure to base64 string"""
        buffer = BytesIO()
        fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close(fig)
        return f"data:image/png;base64,{image_base64}"
    
    def plot_confusion_matrix(self, cm: np.ndarray, labels: Optional[List[str]] = None) -> str:
        """Plot confusion matrix"""
        fig, ax = plt.subplots(figsize=(8, 6))
        
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax,
                   xticklabels=labels if labels else 'auto',
                   yticklabels=labels if labels else 'auto')
        
        ax.set_xlabel('Predicted Label')
        ax.set_ylabel('True Label')
        ax.set_title('Confusion Matrix')
        
        return self._fig_to_base64(fig)
    
    def plot_roc_curve(self, fpr: List[float], tpr: List[float], auc_score: float) -> str:
        """Plot ROC curve"""
        fig, ax = plt.subplots(figsize=(8, 6))
        
        ax.plot(fpr, tpr, color='darkorange', lw=2, 
               label=f'ROC curve (AUC = {auc_score:.3f})')
        ax.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', 
               label='Random Classifier')
        
        ax.set_xlim([0.0, 1.0])
        ax.set_ylim([0.0, 1.05])
        ax.set_xlabel('False Positive Rate')
        ax.set_ylabel('True Positive Rate')
        ax.set_title('Receiver Operating Characteristic (ROC) Curve')
        ax.legend(loc="lower right")
        ax.grid(True, alpha=0.3)
        
        return self._fig_to_base64(fig)
    
    def plot_feature_importance(self, feature_importance: List[Dict[str, Any]], 
                               top_n: int = 10) -> str:
        """Plot feature importance"""
        # Sort and get top N features
        sorted_features = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)[:top_n]
        
        features = [f['feature'] for f in sorted_features]
        importances = [f['importance'] for f in sorted_features]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(features)))
        bars = ax.barh(features, importances, color=colors)
        
        ax.set_xlabel('Importance')
        ax.set_title('Feature Importance (Top 10)')
        ax.invert_yaxis()
        
        # Add value labels
        for i, (bar, imp) in enumerate(zip(bars, importances)):
            ax.text(imp, i, f' {imp:.3f}', va='center')
        
        return self._fig_to_base64(fig)
    
    def plot_learning_curve(self, history: Dict[str, List[float]]) -> str:
        """Plot training and validation learning curves"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        epochs = history.get('epochs', list(range(1, len(history['train_loss']) + 1)))
        
        # Loss plot
        ax1.plot(epochs, history['train_loss'], 'b-', label='Training Loss', linewidth=2)
        ax1.plot(epochs, history['val_loss'], 'r-', label='Validation Loss', linewidth=2)
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.set_title('Model Loss')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Accuracy plot (if available)
        if 'train_acc' in history and history['train_acc']:
            ax2.plot(epochs, history['train_acc'], 'b-', label='Training Accuracy', linewidth=2)
            ax2.plot(epochs, history['val_acc'], 'r-', label='Validation Accuracy', linewidth=2)
            ax2.set_xlabel('Epoch')
            ax2.set_ylabel('Accuracy')
            ax2.set_title('Model Accuracy')
            ax2.legend()
            ax2.grid(True, alpha=0.3)
        else:
            ax2.text(0.5, 0.5, 'Accuracy not available\n(Regression task)', 
                    ha='center', va='center', transform=ax2.transAxes)
            ax2.set_title('Model Accuracy')
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_predictions_distribution(self, predictions: List[Dict[str, Any]], 
                                     is_classification: bool = True) -> str:
        """Plot distribution of predictions"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        if is_classification:
            # For classification, plot confidence distribution
            confidences = [p.get('confidence', 0) for p in predictions]
            
            ax.hist(confidences, bins=20, color='skyblue', edgecolor='black', alpha=0.7)
            ax.set_xlabel('Confidence')
            ax.set_ylabel('Frequency')
            ax.set_title('Prediction Confidence Distribution')
            ax.axvline(np.mean(confidences), color='red', linestyle='--', 
                      linewidth=2, label=f'Mean: {np.mean(confidences):.3f}')
            ax.legend()
        else:
            # For regression, plot predicted vs actual
            true_values = [p['true_value'] for p in predictions]
            pred_values = [p['predicted_value'] for p in predictions]
            
            ax.scatter(true_values, pred_values, alpha=0.6, s=50)
            
            # Add diagonal line
            min_val = min(min(true_values), min(pred_values))
            max_val = max(max(true_values), max(pred_values))
            ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, 
                   label='Perfect Prediction')
            
            ax.set_xlabel('True Values')
            ax.set_ylabel('Predicted Values')
            ax.set_title('Predicted vs Actual Values')
            ax.legend()
        
        ax.grid(True, alpha=0.3)
        return self._fig_to_base64(fig)
    
    def plot_residuals(self, predictions: List[Dict[str, Any]]) -> str:
        """Plot residuals for regression tasks"""
        true_values = np.array([p['true_value'] for p in predictions])
        pred_values = np.array([p['predicted_value'] for p in predictions])
        residuals = true_values - pred_values
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        # Residual plot
        ax1.scatter(pred_values, residuals, alpha=0.6, s=50)
        ax1.axhline(y=0, color='r', linestyle='--', linewidth=2)
        ax1.set_xlabel('Predicted Values')
        ax1.set_ylabel('Residuals')
        ax1.set_title('Residual Plot')
        ax1.grid(True, alpha=0.3)
        
        # Residual distribution
        ax2.hist(residuals, bins=20, color='skyblue', edgecolor='black', alpha=0.7)
        ax2.set_xlabel('Residuals')
        ax2.set_ylabel('Frequency')
        ax2.set_title('Residual Distribution')
        ax2.axvline(0, color='red', linestyle='--', linewidth=2)
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_metrics_comparison(self, metrics: Dict[str, float]) -> str:
        """Plot comparison of different metrics"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Filter numeric metrics
        metric_names = []
        metric_values = []
        
        for key, value in metrics.items():
            if isinstance(value, (int, float)) and not key.startswith('test_') and key not in ['cv_mean', 'cv_std']:
                metric_names.append(key.replace('_', ' ').title())
                metric_values.append(value)
        
        if metric_names:
            colors = plt.cm.Set3(np.linspace(0, 1, len(metric_names)))
            bars = ax.bar(metric_names, metric_values, color=colors, edgecolor='black', alpha=0.7)
            
            ax.set_ylabel('Score')
            ax.set_title('Model Performance Metrics')
            ax.set_ylim([0, max(metric_values) * 1.1])
            
            # Add value labels on bars
            for bar, value in zip(bars, metric_values):
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{value:.3f}', ha='center', va='bottom')
            
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
        else:
            ax.text(0.5, 0.5, 'No metrics available', 
                   ha='center', va='center', transform=ax.transAxes)
        
        return self._fig_to_base64(fig)
    
    def plot_cross_validation_scores(self, cv_scores: List[float]) -> str:
        """Plot cross-validation scores"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        folds = list(range(1, len(cv_scores) + 1))
        
        ax.plot(folds, cv_scores, 'bo-', linewidth=2, markersize=8, label='CV Scores')
        ax.axhline(y=np.mean(cv_scores), color='r', linestyle='--', 
                  linewidth=2, label=f'Mean: {np.mean(cv_scores):.3f}')
        ax.fill_between(folds, 
                       np.mean(cv_scores) - np.std(cv_scores),
                       np.mean(cv_scores) + np.std(cv_scores),
                       alpha=0.2, color='red', label=f'Std: ±{np.std(cv_scores):.3f}')
        
        ax.set_xlabel('Fold')
        ax.set_ylabel('Score')
        ax.set_title('Cross-Validation Scores')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_xticks(folds)
        
        return self._fig_to_base64(fig)
    
    def generate_all_plots(self, training_results: Dict[str, Any], 
                          framework: str = "sklearn") -> Dict[str, str]:
        """Generate all relevant plots for training results"""
        plots = {}
        
        try:
            # Confusion matrix (classification only)
            if 'confusion_matrix' in training_results:
                cm = np.array(training_results['confusion_matrix'])
                plots['confusion_matrix'] = self.plot_confusion_matrix(cm)
            
            # ROC curve (binary classification only)
            if 'roc_curve' in training_results:
                roc_data = training_results['roc_curve']
                auc = training_results.get('auc_score', 0)
                plots['roc_curve'] = self.plot_roc_curve(
                    roc_data['fpr'], roc_data['tpr'], auc
                )
            
            # Feature importance (sklearn only)
            if 'feature_importance' in training_results:
                plots['feature_importance'] = self.plot_feature_importance(
                    training_results['feature_importance']
                )
            
            # Learning curve (PyTorch only)
            if 'training_history' in training_results:
                plots['learning_curve'] = self.plot_learning_curve(
                    training_results['training_history']
                )
            
            # Cross-validation scores (sklearn only)
            if 'cv_scores' in training_results:
                plots['cv_scores'] = self.plot_cross_validation_scores(
                    training_results['cv_scores']
                )
            
            # Metrics comparison
            plots['metrics_comparison'] = self.plot_metrics_comparison(training_results)
            
        except Exception as e:
            print(f"Error generating plots: {e}")
        
        return plots
