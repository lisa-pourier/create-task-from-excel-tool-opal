import fetch from 'node-fetch';

export interface Shard {
  id: string;
}

export class Rivendell {
  public static async shards(): Promise<string[]> {
    const response = await fetch('https://rivendell.zaius.com/shards');
    const shards = (await response.json()) as Shard[];
    return shards.map((x) => x.id);
  }
}
