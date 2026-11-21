# Predictive Maintenance of Turbofan Engines using Deep Learning on NASA C-MAPSS FD001

## 📌 Project Overview
A B.Tech 5th-Semester Mini Project in Artificial Intelligence and Machine Learning (AI & ML).

Predictive maintenance uses sensor telemetry and historical operational data to anticipate equipment failures before they occur. This project develops and evaluates deep learning architectures to estimate the Remaining Useful Life (RUL) of aircraft turbofan engines.

---

## 🎯 Objective
* Model degradation trajectories of turbofan engines using multi-sensor time-series telemetry.
* Predict the exact **Remaining Useful Life (RUL)** in run-to-failure cycles.
* Compare standard machine learning baselines with deep temporal sequence models (e.g., CNN, LSTM, GRU).
* Evaluate model performance using standard metrics (RMSE, MAE) and the asymmetric NASA Scoring Function (which penalizes late predictions more severely than early ones).

---

## 📊 Dataset
* **Name:** NASA C-MAPSS (Commercial Modular Aero-Propulsion System Simulation) Dataset
* **Subset:** **FD001**
  * **Operating Conditions:** 1 (Sea Level)
  * **Fault Modes:** 1 (HPC - High Pressure Compressor degradation)
  * **Data Channels:** 3 operational settings + 21 sensor measurements across operational cycles.

---

## 🧠 Planned Models
1. **Baseline Regressors:** Random Forest / Gradient Boosting / Linear Regression
2. **Multi-Layer Perceptron (MLP / ANN):** Dense feature-level degradation mapping
3. **Convolutional Neural Networks (1D-CNN):** Local temporal feature extraction across sensor sequences
4. **Recurrent Models (LSTM / BiLSTM / GRU):** Long-term sequential dependency and degradation tracking
5. **Hybrid Architecture (Optional/Extension):** CNN-LSTM or Attention-based / Transformer models

---

## 📁 Repository Structure
```
Turbofan-Predictive-Maintenance/
│
├── data/
│   └── raw/              # Raw NASA C-MAPSS FD001 dataset files
│
├── notebooks/            # Jupyter notebooks for EDA, preprocessing, and training
│
├── models/               # Saved trained model weights and architectures
│
├── outputs/
│   ├── figures/          # Plots, training curves, and evaluation charts
│   └── results/          # Evaluation metrics, predictions, and benchmark scores
│
├── reports/              # Project reports, presentations, and documentation
│
└── README.md             # Project documentation and summary
```

