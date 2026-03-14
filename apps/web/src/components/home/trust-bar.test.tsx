import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrustBar } from './trust-bar';

describe('TrustBar', () => {
  it('renders grounded trust signals', () => {
    render(<TrustBar />);

    expect(screen.getByRole('heading', { name: /a calmer, more accountable product experience/i })).toBeInTheDocument();
    expect(screen.getByText('Verified veteran accounts')).toBeInTheDocument();
    expect(screen.getByText('Clear review process')).toBeInTheDocument();
    expect(screen.getByText('Moderation and audit trail')).toBeInTheDocument();
    expect(screen.getByText('Privacy and readability')).toBeInTheDocument();
  });
});
