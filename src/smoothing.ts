/** Aproxima cada valor do alvo com decaimento exponencial, independente do framerate. */
export class Smoother {
  readonly current: number[];
  readonly target: number[];

  /** rate: quão rápido segue o alvo (1/s). ~10 fecha 63% do erro em 0,1 s. */
  constructor(size: number, private rate = 10) {
    this.current = new Array(size).fill(0);
    this.target = new Array(size).fill(0);
  }

  setTarget(values: number[]): void {
    values.forEach((v, i) => (this.target[i] = v));
  }

  /** Pula direto para os valores, sem interpolar (primeira leitura). */
  snap(values: number[]): void {
    values.forEach((v, i) => (this.current[i] = this.target[i] = v));
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-this.rate * dt);
    for (let i = 0; i < this.current.length; i++) this.current[i] += (this.target[i] - this.current[i]) * k;
  }
}
