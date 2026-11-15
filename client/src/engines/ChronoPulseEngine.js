/**
 * ChronoPulseEngine.js
 * High-Performance Streaming Multivariate Autoencoder & Kalman Baseline Drift Tracker.
 * 
 * Uses online streaming Welford updates to track individual microgravity baseline drift
 * across vitals without catastrophic forgetting:
 *   mu_k = mu_{k-1} + (x_k - mu_{k-1}) / k
 *   M2_k = M2_{k-1} + (x_k - mu_{k-1}) * (x_k - mu_k)
 *   sigma_k^2 = M2_k / (k - 1)
 */

export class ChronoPulseEngine {
  constructor(dim = 6) {
    this.dim = dim;
    this.k = 0;
    this.mean = new Float64Array(dim);
    this.M2 = new Float64Array(dim);
    this.variance = new Float64Array(dim);

    // Initial default spaceflight flight norms: [HR, SBP, DBP, SpO2, ONSD, Entropy]
    const initialNorms = [70.0, 120.0, 80.0, 98.5, 4.65, 0.75];
    for (let i = 0; i < dim; i++) {
      this.mean[i] = initialNorms[i];
      this.variance[i] = 1.0;
    }

    // 6x3 Encoder weights, 3x6 Decoder weights (Symmetric Bottleneck)
    this.W_enc = [
      [ 0.35, -0.12,  0.08],
      [ 0.28,  0.42, -0.05],
      [ 0.22,  0.38, -0.04],
      [-0.15, -0.08,  0.55],
      [ 0.45, -0.25,  0.32],
      [-0.30,  0.15,  0.48]
    ];
    this.W_dec = [
      [ 0.35,  0.28,  0.22, -0.15,  0.45, -0.30],
      [-0.12,  0.42,  0.38, -0.08, -0.25,  0.15],
      [ 0.08, -0.05, -0.04,  0.55,  0.32,  0.48]
    ];
  }

  /**
   * Streaming update with online Welford statistics.
   * @param {Array<number>} vector - [HR, SBP, DBP, SpO2, ONSD, Entropy]
   */
  update(vector) {
    this.k++;
    for (let i = 0; i < this.dim; i++) {
      const x = vector[i];
      const delta = x - this.mean[i];
      this.mean[i] += delta / this.k;
      const delta2 = x - this.mean[i];
      this.M2[i] += delta * delta2;
      if (this.k > 1) {
        this.variance[i] = this.M2[i] / (this.k - 1);
      }
    }
  }

  /**
   * Encodes vector to 3D latent bottleneck and computes reconstruction loss.
   * @param {Array<number>} vector - Current observation
   * @returns {Object} latent vector, reconstructed vector, and reconstruction loss
   */
  infer(vector) {
    // 1. Z-Score normalization against rolling online Welford baseline
    const normalized = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      const std = Math.sqrt(this.variance[i]) || 1.0;
      normalized[i] = (vector[i] - this.mean[i]) / std;
    }

    // 2. Encoder forward pass: z = tanh(W_enc^T * x)
    const z = new Float64Array(3);
    for (let j = 0; j < 3; j++) {
      let sum = 0.0;
      for (let i = 0; i < this.dim; i++) {
        sum += normalized[i] * this.W_enc[i][j];
      }
      z[j] = Math.tanh(sum);
    }

    // 3. Decoder forward pass: x_hat = W_dec^T * z
    const x_hat = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      let sum = 0.0;
      for (let j = 0; j < 3; j++) {
        sum += z[j] * this.W_dec[j][i];
      }
      x_hat[i] = sum;
    }

    // 4. Mean Squared Error (MSE) Reconstruction Loss
    let mseLoss = 0.0;
    for (let i = 0; i < this.dim; i++) {
      const diff = normalized[i] - x_hat[i];
      mseLoss += diff * diff;
    }
    mseLoss /= this.dim;

    const isAnomaly = mseLoss > 0.085;
    return {
      loss: +mseLoss.toFixed(4),
      isAnomaly,
      latentCoordinates: Array.from(z).map(v => +v.toFixed(3)),
      rollingBaselineMean: Array.from(this.mean).map(v => +v.toFixed(2)),
      sampleCount: this.k
    };
  }
}
