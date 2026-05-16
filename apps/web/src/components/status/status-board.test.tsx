import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusBoard } from './status-board';

type MockJsonResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

function makeJsonResponse(payload: unknown, status = 200): MockJsonResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe('StatusBoard', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a neutral first-check state before the first poll completes', () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    render(<StatusBoard />);

    expect(screen.getByText('Running first health check...')).toBeInTheDocument();
    expect(screen.getByText('Checking live status...')).toBeInTheDocument();
    expect(screen.getAllByText('Checking...').length).toBeGreaterThan(0);
    expect(screen.queryByText('We are seeing a service issue right now.')).not.toBeInTheDocument();
    expect(screen.queryByText('Degraded')).not.toBeInTheDocument();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('shows healthy status after the first successful poll', async () => {
    fetchMock
      .mockResolvedValueOnce(makeJsonResponse({
        data: {
          service: 'web',
          status: 'alive',
          uptime: 3600,
          timestamp: '2026-05-16T11:00:00.000Z',
          startedAt: '2026-05-16T10:00:00.000Z',
        },
      }))
      .mockResolvedValueOnce(makeJsonResponse({
        data: {
          status: 'alive',
          uptime: 3200,
          timestamp: '2026-05-16T11:00:00.000Z',
        },
      }))
      .mockResolvedValueOnce(makeJsonResponse({
        data: {
          status: 'ready',
          timestamp: '2026-05-16T11:00:00.000Z',
          checks: {
            database: true,
            redis: true,
          },
        },
      }));

    render(<StatusBoard />);

    await waitFor(() => {
      expect(screen.getByText('All core services are online.')).toBeInTheDocument();
    });

    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getAllByText('Online').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
    expect(screen.queryByText('Running first health check now.')).not.toBeInTheDocument();
  });

  it('shows an amber diagnostic error after the first failed poll', async () => {
    fetchMock.mockRejectedValue(new Error('Status probe timed out'));

    render(<StatusBoard />);

    await waitFor(() => {
      expect(screen.getByText('We are seeing a service issue right now.')).toBeInTheDocument();
    });

    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText('Status probe timed out')).toBeInTheDocument();
    expect(screen.queryByText('Checking live status...')).not.toBeInTheDocument();
  });
});
