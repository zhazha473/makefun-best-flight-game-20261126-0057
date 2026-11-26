// Procedural WebAudio sound for SALTWIND COURIER.
// No audio files: an engine hum whose pitch follows the throttle, wind
// noise that rises with speed, and short synthesized blips for rings,
// deliveries, splashes and crashes. Starts only after a user gesture.

export class SaltwindAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.windSource = null;
    this.windGain = null;
    this.windFilter = null;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.engineOsc = this.context.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 62;
    const engineFilter = this.context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.context.destination);
    this.engineOsc.start();

    const bufferLength = this.context.sampleRate * 2;
    const noiseBuffer = this.context.createBuffer(1, bufferLength, this.context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i += 1) data[i] = Math.random() * 2 - 1;
    this.windSource = this.context.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;
    this.windFilter = this.context.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 480;
    this.windFilter.Q.value = 0.6;
    this.windGain = this.context.createGain();
    this.windGain.gain.value = 0.0;
    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.context.destination);
    this.windSource.start();
  }

  setFlight(throttle, speed, airborne) {
    if (!this.context || this.muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.windGain) this.windGain.gain.value = 0;
      return;
    }
    const target = this.context.currentTime + 0.08;
    this.engineOsc.frequency.setTargetAtTime(52 + throttle * 88, target, 0.1);
    this.engineGain.gain.setTargetAtTime(airborne ? 0.035 + throttle * 0.05 : 0.02, target, 0.1);
    this.windGain.gain.setTargetAtTime(airborne ? Math.min(0.09, speed * 0.0011) : 0, target, 0.15);
  }

  blip(frequency, duration, type, volume) {
    if (!this.context || this.muted) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.12, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + duration + 0.02);
  }

  ringChime() {
    this.blip(880, 0.28, 'sine', 0.14);
    setTimeout(() => this.blip(1318, 0.34, 'sine', 0.12), 90);
  }

  deliveryChime() {
    this.blip(523, 0.2, 'triangle', 0.14);
    setTimeout(() => this.blip(659, 0.2, 'triangle', 0.14), 110);
    setTimeout(() => this.blip(784, 0.32, 'triangle', 0.14), 220);
  }

  splashSound() {
    if (!this.context || this.muted) return;
    const bufferLength = this.context.sampleRate * 0.5;
    const noiseBuffer = this.context.createBuffer(1, bufferLength, this.context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferLength);
    const source = this.context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.context.createGain();
    gain.gain.value = 0.22;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }

  crashSound() {
    this.blip(90, 0.6, 'sawtooth', 0.2);
    setTimeout(() => this.blip(55, 0.8, 'sawtooth', 0.18), 120);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
