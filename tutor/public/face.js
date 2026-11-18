// Gli "occhi" del tutor: webcam frontale, SOLO se lei lo sceglie.
// Il video resta sul dispositivo e si vede nel cerchietto. Al tutor va una singola foto piccola
// ogni volta che lei manda un messaggio: niente registrazioni, niente flusso continuo.
export class FaceCam {
  constructor(video) {
    this.video = video;
    this.stream = null;
  }

  get on() {
    return Boolean(this.stream);
  }

  get live() {
    const t = this.stream?.getVideoTracks()[0];
    return Boolean(t && t.readyState === 'live' && !t.muted && this.video.videoWidth > 0);
  }

  async start() {
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  // Una foto ridotta (lato lungo max 768 px): abbastanza per capire cosa c'è, poco per i costi e la privacy.
  snapshot(maxSide = 768, quality = 0.7) {
    if (!this.live) return null;
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    const k = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(this.video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }
}
