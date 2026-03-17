import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerEnquiryForm } from './partner-enquiry-form';

const { submitPartnershipEnquiry, toastSuccess, toastError } = vi.hoisted(() => ({
  submitPartnershipEnquiry: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    submitPartnershipEnquiry,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe('PartnerEnquiryForm', () => {
  beforeEach(() => {
    submitPartnershipEnquiry.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<PartnerEnquiryForm />);

    await user.clear(screen.getByLabelText(/organisation name/i));
    await user.clear(screen.getByLabelText(/contact name/i));
    await user.clear(screen.getByLabelText(/email address/i));
    await user.clear(screen.getByLabelText(/website url/i));
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText(/enter your organisation name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter the main contact name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a full website url including https/i)).toBeInTheDocument();
  });

  it('submits a valid enquiry and shows the success state', async () => {
    const user = userEvent.setup();
    submitPartnershipEnquiry.mockResolvedValue({ success: true });

    render(<PartnerEnquiryForm />);

    await user.clear(screen.getByLabelText(/organisation name/i));
    await user.type(screen.getByLabelText(/organisation name/i), 'Forces Employment Network');
    await user.clear(screen.getByLabelText(/contact name/i));
    await user.type(screen.getByLabelText(/contact name/i), 'Alex Carter');
    await user.clear(screen.getByLabelText(/email address/i));
    await user.type(screen.getByLabelText(/email address/i), 'alex@example.org');
    await user.clear(screen.getByLabelText(/website url/i));
    await user.type(screen.getByLabelText(/website url/i), 'https://example.org');
    await user.type(
      screen.getByLabelText(/short description of your organisation/i),
      'We help veterans move into civilian employment with tailored training and support.',
    );
    await user.type(
      screen.getByLabelText(/why do you want to partner with veteranfinder/i),
      'We would like to explore a curated support listing and occasional spotlight opportunities.',
    );
    await user.click(screen.getByLabelText(/email spotlight/i));
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => {
      expect(submitPartnershipEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationName: 'Forces Employment Network',
          contactName: 'Alex Carter',
          email: 'alex@example.org',
          websiteUrl: 'https://example.org',
          partnershipTypes: ['email_spotlight'],
        }),
      );
    });

    expect(await screen.findByText(/enquiry received for forces employment network/i)).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalled();
  });
});
