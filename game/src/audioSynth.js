// Procedural Web Audio API flight soundscape: twin-propeller harmonics, slipstream wind, stall horn, ring chime, tire chirp & crash boom.

export class FlightAudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.started = false;
    this.masterGain = null;
    this.propOscA = null;
    this.propOscB = null;
    this.propFilter = null;
    this.propGain = null;
    this.windFilter = null;
    this.windGain = null;
    this.stallOsc = null;
    this.stallGain = null;
  }

  initAudio() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.34;
      this.masterGain.connect(this.ctx.destination);

      // Twin turboprop blade-pass harmonic oscillators slightly detuned for realistic twin-engine beat
      this.propFilter = this.ctx.createBiquadFilter();
      this.propFilter.type = 'lowpass';
      this.propFilter.frequency.value = 260;

      this.propGain = this.ctx.createGain();
      this.propGain.gain.value = 0.0;
      this.propFilter.connect(this.propGain);
      this.propGain.connect(this.masterGain);

      this.propOscA = this.ctx.createOscillator();
      this.propOscA.type = 'sawtooth';
      this.propOscA.frequency.value = 72;
      this.propOscA.connect(this.propFilter);
      this.propOscA.start();

      this.propOscB = this.ctx.createOscillator();
      this.propOscB.type = 'triangle';
      this.propOscB.frequency.value = 73.6;
      this.propOscB.connect(this.propFilter);
      this.propOscB.start();

      // White-noise buffer for aerodynamic airflow rush & tire/explosion bursts
      const bufLen = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufLen; i += 1) {
        data[i] = Math.sin(i * 12.9898) * 43758.5453 % 1 * 2 - 1;
      }

      const windSource = this.ctx.createBufferSource();
      windSource.buffer = this.noiseBuffer;
      windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 520;
      this.windFilter.Q.value = 0.85;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0;

      windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      windSource.start();

      // Stall warning aviation horn
      this.stallOsc = this.ctx.createOscillator();
      this.stallOsc.type = 'square';
      this.stallOsc.frequency.value = 880;
      this.stallGain = this.ctx.createGain();
      this.stallGain.gain.value = 0.0;
      this.stallOsc.connect(this.stallGain);
      this.stallGain.connect(this.masterGain);
      this.stallOsc.start();

      this.started = true;
    } catch {
      this.started = false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.34, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  updateFlightAudio(flightState, paused, elapsedSec) {
    if (!this.started || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (paused || flightState.crashed) {
      this.propGain.gain.setTargetAtTime(0, now, 0.06);
      this.windGain.gain.setTargetAtTime(0, now, 0.06);
      this.stallGain.gain.setTargetAtTime(0, now, 0.04);
      return;
    }

    const baseFreq = 54 + flightState.rpmNorm * 82;
    this.propOscA.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.propOscB.frequency.setTargetAtTime(baseFreq * 1.018, now, 0.05);
    this.propFilter.frequency.setTargetAtTime(190 + flightState.throttle * 380, now, 0.06);
    this.propGain.gain.setTargetAtTime(0.14 + flightState.throttle * 0.22, now, 0.06);

    const speedNorm = Math.min(1.5, flightState.airspeedKts / 140);
    this.windFilter.frequency.setTargetAtTime(340 + speedNorm * 820, now, 0.06);
    this.windGain.gain.setTargetAtTime(Math.min(0.24, speedNorm * speedNorm * 0.14), now, 0.06);

    const stallBeep = flightState.stallWarning && Math.floor(elapsedSec * 9) % 2 === 0;
    this.stallGain.gain.setTargetAtTime(stallBeep ? 0.075 : 0.0, now, 0.015);
  }

  playRingChime() {
    if (!this.started || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 987.77];
    for (let i = 0; i < notes.length; i += 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.09);
      gain.gain.setValueAtTime(0.18, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.32);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.34);
    }
  }

  playTouchdownScreech() {
    if (!this.started || !this.ctx || this.muted || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now);
    bp.frequency.exponentialRampToValueAtTime(680, now + 0.28);
    bp.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.34);
  }

  playCrashBoom() {
    if (!this.started || !this.ctx || this.muted || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(320, now);
    lp.frequency.exponentialRampToValueAtTime(55, now + 1.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 1.28);
  }
}
