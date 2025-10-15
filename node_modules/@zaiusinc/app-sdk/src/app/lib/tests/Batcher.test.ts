import 'jest';

import {Batcher} from '../Batcher';

describe('Batcher', () => {
  describe('append', () => {
    it('adds an item to the batch', async () => {
      const fn = jest.fn();
      const batcher = new Batcher(fn);
      await batcher.append('test1');
      await batcher.append('test2');
      expect(batcher['batch']).toEqual(['test1', 'test2']);
      expect(fn).not.toHaveBeenCalled();
    });

    it('performs the operation when the limit is reached', async () => {
      const fn = jest.fn();
      const batcher = new Batcher(fn, 2);
      await batcher.append('test1');
      await batcher.append('test2');
      expect(batcher['batch']).toEqual([]);
      expect(fn).toHaveBeenCalledWith(['test1', 'test2']);
    });
  });

  describe('flush', () => {
    it('flushes when the batch is not empty', async () => {
      const fn = jest.fn();
      const batcher = new Batcher(fn);
      await batcher.append('test1');
      expect(fn).not.toHaveBeenCalled();
      await batcher.flush();
      expect(batcher['batch']).toEqual([]);
      expect(fn).toHaveBeenCalledWith(['test1']);
    });

    it('does not perform the operation if the batch is empty', async () => {
      const fn = jest.fn();
      const batcher = new Batcher(fn);
      await batcher.flush();
      expect(fn).not.toHaveBeenCalled();
    });

    it(
      'does not cause the batch limit to be exceeded' + ' if add is called during flush long running operation',
      async () => {
        const fn = jest.fn(() => new Promise((r) => setTimeout(r, 2000)));
        const batcher = new Batcher(fn, 2);
        await Promise.all([batcher.append('test1'), batcher.append('test2'), batcher.append('test3')]);
        expect(fn).toHaveBeenCalledWith(['test1', 'test2']);
        expect(batcher['batch']).toEqual(['test3']);
      }
    );
  });
});
