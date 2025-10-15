export class Headers {
  private headers: {[name: string]: string} = {};

  public constructor(headers: string[][] = []) {
    this.addFromArray(headers);
  }

  public get(name: string): string | undefined {
    return this.headers[name.toLowerCase()];
  }

  public has(name: string): boolean {
    return !!this.headers[name.toLowerCase()];
  }

  public add(name: string, value: string) {
    if (typeof value !== 'string' || value === '') {
      return;
    }

    name = name.toLowerCase();
    if (this.headers[name]) {
      this.headers[name] += ',' + value;
    } else {
      this.headers[name] = value;
    }
  }

  public set(name: string, value: string | null) {
    name = name.toLowerCase();
    if (value === null || value === '' || typeof value !== 'string') {
      delete this.headers[name];
    } else {
      this.headers[name] = value;
    }
  }

  public toArray(): string[][] {
    return Object.keys(this.headers).map((key) => [key, this.headers[key]]);
  }

  public addFromArray(headers: string[][]) {
    headers.forEach(([name, value]) => this.add(name, value));
  }

  public setFromObject(headers: {[name: string]: string}) {
    Object.keys(headers).forEach((name) => this.set(name, headers[name]));
  }
}
