'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminSelect,
  AdminStatusChip,
  AdminTableCell,
  AdminTableHeadCell,
  AdminTableShell,
  adminActionButtonStyle,
  adminTheme,
} from '@/components/admin-ui';

const statusColors: Record<string, string> = {
  DRAFT: adminTheme.textMuted,
  SCHEDULED: adminTheme.warning,
  PUBLISHED: adminTheme.success,
  ARCHIVED: '#94a3b8',
};

function formatReadTime(minutes: number): string {
  if (minutes <= 4) return `Quick read · ${minutes} min`;
  if (minutes <= 8) return `${minutes} min read`;
  return `Longer read · ${minutes} min`;
}

function formatPublishLabel(post: any) {
  const value = post.status === 'SCHEDULED' ? post.publishAt : post.publishedAt || post.publishAt;
  if (!value) {
    return 'Not set';
  }

  const prefix = post.status === 'SCHEDULED' ? 'Scheduled' : 'Published';
  return `${prefix} ${new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [analyticsByPost, setAnalyticsByPost] = useState<Record<string, any>>({});
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getBlogPosts({
        page,
        limit: 25,
        status: status || undefined,
      });
      const nextPosts = response.posts || [];
      setPosts(nextPosts);
      setPages(response.pages || 1);
      setTotal(response.total || 0);

      const analyticsPairs = await Promise.all(
        nextPosts.map(async (post: any) => {
          try {
            const analytics = await adminApi.getBlogAnalytics(post.id);
            return [post.id, analytics] as const;
          } catch {
            return [post.id, { totalViews: 0 }] as const;
          }
        }),
      );

      setAnalyticsByPost(Object.fromEntries(analyticsPairs));
    } catch {
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchPosts().catch(console.error);
  }, [fetchPosts]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) {
      return;
    }

    setDeletingId(postId);
    try {
      await adminApi.deleteBlogPost(postId);
      toast.success('Post deleted');
      await fetchPosts();
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Publishing"
        title="Blog management"
        description={`${total.toLocaleString()} posts across all statuses. Draft, schedule, publish, and review performance from one place.`}
        actions={(
          <>
            <button type="button" onClick={() => fetchPosts()} style={adminActionButtonStyle(adminTheme.info)}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link href="/blog/new" style={adminActionButtonStyle(adminTheme.accent)}>
              <Plus size={14} />
              New post
            </Link>
          </>
        )}
      />

      <AdminFilterBar>
        <AdminSelect value={status} onChange={setStatus}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </AdminSelect>
      </AdminFilterBar>

      <AdminTableShell>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <AdminTableHeadCell>Title</AdminTableHeadCell>
              <AdminTableHeadCell>Status</AdminTableHeadCell>
              <AdminTableHeadCell>Scheduled / Published</AdminTableHeadCell>
              <AdminTableHeadCell>Read time</AdminTableHeadCell>
              <AdminTableHeadCell>Views</AdminTableHeadCell>
              <AdminTableHeadCell>Edit</AdminTableHeadCell>
              <AdminTableHeadCell>Delete</AdminTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, index) => (
                <tr key={index}>
                  {[260, 90, 130, 110, 70, 80, 80].map((width, cellIndex) => (
                    <AdminTableCell key={cellIndex}>
                      <div style={{ height: 13, width, background: '#111c2e', borderRadius: 4 }} />
                    </AdminTableCell>
                  ))}
                </tr>
              ))
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <AdminEmptyState title="NO POSTS FOUND" hint="Create a new post to start building the blog." />
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id}>
                  <AdminTableCell>
                    <div>
                      <p style={{ color: adminTheme.textStrong, fontWeight: 600 }}>{post.title}</p>
                      <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4 }}>
                        /blog/{post.slug}
                      </p>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusChip label={post.status} color={statusColors[post.status] || adminTheme.textMuted} />
                  </AdminTableCell>
                  <AdminTableCell>{formatPublishLabel(post)}</AdminTableCell>
                  <AdminTableCell>{formatReadTime(post.readTimeMinutes || 1)}</AdminTableCell>
                  <AdminTableCell>{analyticsByPost[post.id]?.totalViews ?? 0}</AdminTableCell>
                  <AdminTableCell>
                    <Link href={`/blog/${post.id}`} style={adminActionButtonStyle(adminTheme.info, true)}>
                      <Pencil size={13} />
                      Edit
                    </Link>
                  </AdminTableCell>
                  <AdminTableCell>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      style={adminActionButtonStyle(adminTheme.danger, true)}
                    >
                      <Trash2 size={13} />
                      {deletingId === post.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </AdminTableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {pages > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
          <p style={{ color: adminTheme.textSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            PAGE {page} OF {pages}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
              <ChevronLeft size={13} />
            </button>
            <button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page === pages} style={adminActionButtonStyle(adminTheme.textMuted, true)}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
