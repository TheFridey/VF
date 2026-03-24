import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroSection } from './hero-section';

describe('HeroSection', () => {
  it('renders a minimal reconnection-focused hero', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading', { name: /find the people you served with/i })).toBeInTheDocument();
    expect(screen.getByText('Veteran-only access')).toBeInTheDocument();
    expect(screen.getByText('Shared overlap')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your profile/i })).toHaveAttribute('href', '/auth/register');
  });
});
