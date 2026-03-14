import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroSection } from './hero-section';

describe('HeroSection', () => {
  it('renders trust-first headline and next-step guidance', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading', { name: /somewhere in here is someone who remembers/i })).toBeInTheDocument();
    expect(screen.getByText('Veteran-only access with verification')).toBeInTheDocument();
    expect(screen.getByText('What this feels like')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start looking/i })).toHaveAttribute('href', '/auth/register');
  });
});
