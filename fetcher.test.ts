import Fetcher from './fetcher';

describe('Fetcher', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GET request', async () => {
    const responseData = { message: 'success' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => responseData,
      headers: new Headers(),
    });

    const response = await Fetcher.get('https://api.example.com/data');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
      signal: expect.any(AbortSignal),
    });

    expect(response.data).toEqual(responseData);
  });

  // Add more tests for POST, PUT, DELETE, and other scenarios
});
