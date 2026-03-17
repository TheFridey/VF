import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './footer';

describe('Footer', () => {
  it('includes the partner with us link in the public footer', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: /partner with us/i })).toHaveAttribute('href', '/partner-with-us');
  });
});
