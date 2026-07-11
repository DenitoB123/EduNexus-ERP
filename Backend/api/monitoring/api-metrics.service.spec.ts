import { ApiMetricsService } from './api-metrics.service';

describe('ApiMetricsService', () => {
  it('records requests and computes average duration', () => {
    const service = new ApiMetricsService();
    service.record('GET /things', 100, false);
    service.record('GET /things', 200, false);

    const snapshot = service.getSnapshot();
    expect(snapshot['GET /things'].requests).toBe(2);
    expect(snapshot['GET /things'].averageDurationMs).toBe(150);
    expect(snapshot['GET /things'].errorRate).toBe(0);
  });

  it('tracks errors and computes error rate', () => {
    const service = new ApiMetricsService();
    service.record('POST /things', 50, false);
    service.record('POST /things', 50, true);

    const snapshot = service.getSnapshot();
    expect(snapshot['POST /things'].errors).toBe(1);
    expect(snapshot['POST /things'].errorRate).toBe(0.5);
  });

  it('reset() clears all metrics', () => {
    const service = new ApiMetricsService();
    service.record('GET /x', 10, false);
    service.reset();
    expect(service.getSnapshot()).toEqual({});
  });
});
