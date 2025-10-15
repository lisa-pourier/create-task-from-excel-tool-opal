import {Notifier} from './Notifier';

const noop = () => {
  /**/
};

/**
 * @hidden
 * A simple noop stub of the notifier api
 */
export class LocalNotifier implements Notifier {
  public async info(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    noop();
  }

  public async success(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    noop();
  }

  public async warn(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    noop();
  }

  public async error(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    noop();
  }
}
