const mockPost = jest.fn();
const mockPut = jest.fn();
const mockGet = jest.fn();

jest.mock('../../src/core/axios', () => ({
  post: (...args: any[]) => mockPost(...args),
  put: (...args: any[]) => mockPut(...args),
  get: (...args: any[]) => mockGet(...args),
}));

import { startRound } from '../../src/screens/home/service/round.service';

describe('inicio de ronda', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ success: true, data: { id: 1 } });
  });

  it('siempre envía confirmed=true y no manda guardId', async () => {
    await startRound(33, 7);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [, body] = mockPost.mock.calls[0];
    expect(body).toEqual({
      recurringConfigId: 7,
      clientRef: undefined,
      confirmed: true,
    });
    expect(body).not.toHaveProperty('guardId');
  });
});
