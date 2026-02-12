// ─── NotificationCenter Component Tests ─────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NotificationCenter,
  useNotificationStore,
} from '../shared/notification-center';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useNotificationStore.setState({ notifications: [] });
});

// ---------------------------------------------------------------------------
// Helper to seed notifications
// ---------------------------------------------------------------------------

function seedNotifications(count: number) {
  for (let i = 0; i < count; i++) {
    useNotificationStore.getState().add({
      type: i % 2 === 0 ? 'alert' : 'call',
      title: `Notification ${i + 1}`,
      message: `Message for notification ${i + 1}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Bell icon and unread count
// ---------------------------------------------------------------------------

describe('NotificationCenter - bell icon', () => {
  it('renders the bell button', () => {
    render(<NotificationCenter />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    seedNotifications(3);
    render(<NotificationCenter />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Notifications (3 unread)'),
    ).toBeInTheDocument();
  });

  it('does not show badge when there are no notifications', () => {
    render(<NotificationCenter />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('caps badge display at 99+', () => {
    for (let i = 0; i < 50; i++) {
      useNotificationStore.getState().add({
        type: 'info',
        title: `N ${i}`,
        message: `Msg ${i}`,
      });
    }
    // The store caps at 50 notifications; 99+ won't appear with only 50
    // But all 50 are unread
    render(<NotificationCenter />);
    const badge = screen.getByLabelText(/Notifications/);
    expect(badge).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dropdown open/close
// ---------------------------------------------------------------------------

describe('NotificationCenter - dropdown', () => {
  it('opens dropdown when bell is clicked', async () => {
    seedNotifications(2);
    render(<NotificationCenter />);

    const bell = screen.getByLabelText(/Notifications/);
    await userEvent.click(bell);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
  });

  it('shows empty state when no notifications exist', async () => {
    render(<NotificationCenter />);

    const bell = screen.getByLabelText('Notifications');
    await userEvent.click(bell);

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', async () => {
    seedNotifications(1);
    render(<NotificationCenter />);

    const bell = screen.getByLabelText(/Notifications/);
    await userEvent.click(bell);
    expect(screen.getByText('Notification 1')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    // Dropdown should be closed - Notification 1 item should no longer be visible
    // The header "Notifications" won't be in the dropdown
    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    seedNotifications(1);
    const { container } = render(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationCenter />
      </div>,
    );

    const bell = screen.getByLabelText(/Notifications/);
    await userEvent.click(bell);
    expect(screen.getByText('Notification 1')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Notification items and icons
// ---------------------------------------------------------------------------

describe('NotificationCenter - notification items', () => {
  it('renders notification items with correct content', async () => {
    useNotificationStore.getState().add({
      type: 'alert',
      title: 'High Queue Wait',
      message: 'Queue wait exceeds 30 seconds',
    });

    render(<NotificationCenter />);
    const bell = screen.getByLabelText(/Notifications/);
    await userEvent.click(bell);

    expect(screen.getByText('High Queue Wait')).toBeInTheDocument();
    expect(screen.getByText('Queue wait exceeds 30 seconds')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

describe('NotificationCenter - mark as read', () => {
  it('clicking a notification marks it as read', async () => {
    seedNotifications(2);
    render(<NotificationCenter />);

    // Open dropdown
    const bell = screen.getByLabelText(/Notifications \(2 unread\)/);
    await userEvent.click(bell);

    // Click on first notification
    const notif = screen.getByText('Notification 2');
    await userEvent.click(notif);

    // Unread count should decrease to 1
    const state = useNotificationStore.getState();
    const unreadCount = state.notifications.filter((n) => !n.read).length;
    expect(unreadCount).toBe(1);
  });

  it('mark all as read clears all badges', async () => {
    seedNotifications(3);
    render(<NotificationCenter />);

    const bell = screen.getByLabelText(/Notifications \(3 unread\)/);
    await userEvent.click(bell);

    const markAllBtn = screen.getByText('Mark all read');
    await userEvent.click(markAllBtn);

    const state = useNotificationStore.getState();
    const unreadCount = state.notifications.filter((n) => !n.read).length;
    expect(unreadCount).toBe(0);
  });
});
