import { CategoriesService, CategoryCount } from './categories.service';
import type { DatabaseService } from '../database/database.service';

const counted = (papers: number): CategoryCount[] => [
  { id: 'cs.LG', papers, primary: papers },
];

describe('CategoriesService', () => {
  const HOUR = 60 * 60 * 1000;
  let service: CategoriesService;
  let count: jest.Mock<Promise<CategoryCount[]>>;

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    service = new CategoriesService({} as DatabaseService);
    count = jest.fn();
    (service as unknown as { count: typeof count }).count = count;
  });
  afterEach(() => jest.useRealTimers());

  it('counts once and keeps the answer for an hour', async () => {
    count.mockResolvedValue(counted(1));
    await expect(service.counts()).resolves.toEqual(counted(1));
    jest.setSystemTime(HOUR - 1);
    await service.counts();
    expect(count).toHaveBeenCalledTimes(1);
  });

  it('gives the old answer while a newer count runs, then the new one', async () => {
    count.mockResolvedValueOnce(counted(1));
    await service.counts();

    let finish!: (c: CategoryCount[]) => void;
    count.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    jest.setSystemTime(HOUR + 1);
    await expect(service.counts()).resolves.toEqual(counted(1));
    await expect(service.counts()).resolves.toEqual(counted(1));
    expect(count).toHaveBeenCalledTimes(2); // one recount, not one per request

    finish(counted(2));
    await Promise.resolve();
    await Promise.resolve();
    await expect(service.counts()).resolves.toEqual(counted(2));
  });

  it('keeps the old answer when a recount fails', async () => {
    count.mockResolvedValue(counted(1)); // later attempts
    count.mockResolvedValueOnce(counted(1));
    await service.counts();
    count.mockRejectedValueOnce(new Error('timeout'));
    jest.setSystemTime(HOUR + 1);
    await expect(service.counts()).resolves.toEqual(counted(1));
    await Promise.resolve();
    await Promise.resolve();
    await expect(service.counts()).resolves.toEqual(counted(1));
  });
});
