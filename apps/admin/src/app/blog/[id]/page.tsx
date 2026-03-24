'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import {
  AdminCard,
  AdminMetricCard,
  AdminPageHeader,
  AdminSelect,
  adminActionButtonStyle,
  adminTextareaStyle,
  adminTheme,
  adminTypography,
} from '@/components/admin-ui';

type BlogFormState = {
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  publishAt: string;
  body: string;
};

const defaultState: BlogFormState = {
  title: '',
  slug: '',
  excerpt: '',
  coverImageUrl: '',
  tags: [],
  metaTitle: '',
  metaDescription: '',
  status: 'DRAFT',
  publishAt: '',
  body: '<p></p>',
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function calculateReadTime(html: string) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function formatAverageReadTime(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        color: adminTheme.textSoft,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 8,
      }}
    >
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: '#060c17',
        border: `1px solid ${adminTheme.panelBorder}`,
        borderRadius: 8,
        padding: '10px 12px',
        color: adminTheme.text,
        fontSize: 13,
        outline: 'none',
      }}
    />
  );
}

function ToolbarButton({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...adminActionButtonStyle(active ? adminTheme.accent : adminTheme.textMuted, true),
        background: active ? `${adminTheme.accent}20` : '#060c17',
      }}
    >
      {label}
    </button>
  );
}

export default function BlogEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isNew = id === 'new';

  const [form, setForm] = useState<BlogFormState>(defaultState);
  const [tagInput, setTagInput] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'analytics'>('editor');
  const [analytics, setAnalytics] = useState<{
    totalViews: number;
    uniqueVisitors: number;
    avgReadTimeMs: number;
    referrers: Record<string, number>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [estimatedReadTime, setEstimatedReadTime] = useState(1);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Image,
      Placeholder.configure({ placeholder: 'Write the article here...' }),
      CharacterCount,
    ],
    content: form.body,
    onUpdate: ({ editor: nextEditor }) => {
      setForm((current) => ({ ...current, body: nextEditor.getHTML() }));
    },
    editorProps: {
      attributes: {
        style: `min-height: 420px; padding: 18px; color: ${adminTheme.textStrong}; outline: none;`,
      },
    },
  });

  useEffect(() => {
    if (!slugTouched && form.title) {
      setForm((current) => ({ ...current, slug: slugify(current.title) }));
    }
  }, [form.title, slugTouched]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setEstimatedReadTime(calculateReadTime(form.body));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [form.body]);

  useEffect(() => {
    if (isNew) return;
    let mounted = true;

    const loadPost = async () => {
      setLoading(true);
      try {
        const post = await adminApi.getBlogPost(id);
        if (!mounted) return;
        setForm({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          coverImageUrl: post.coverImageUrl || '',
          tags: post.tags || [],
          metaTitle: post.metaTitle || '',
          metaDescription: post.metaDescription || '',
          status: post.status || 'DRAFT',
          publishAt: toDateTimeLocal(post.publishAt),
          body: post.body || '<p></p>',
        });
        setSlugTouched(true);
        editor?.commands.setContent(post.body || '<p></p>', { emitUpdate: false });
      } catch {
        toast.error('Failed to load post');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPost().catch(console.error);
    return () => {
      mounted = false;
    };
  }, [editor, id, isNew]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== form.body) {
      editor.commands.setContent(form.body || '<p></p>', { emitUpdate: false });
    }
  }, [editor, form.body]);

  useEffect(() => {
    if (activeTab !== 'analytics' || isNew) return;
    let mounted = true;

    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const response = await adminApi.getBlogAnalytics(id, { days: 30 });
        if (mounted) setAnalytics(response);
      } catch {
        if (mounted) toast.error('Failed to load analytics');
      } finally {
        if (mounted) setAnalyticsLoading(false);
      }
    };

    loadAnalytics().catch(console.error);
    return () => {
      mounted = false;
    };
  }, [activeTab, id, isNew]);

  const savePost = async () => {
    if (form.excerpt.length > 300) return toast.error('Excerpt must be 300 characters or fewer');
    if (form.metaTitle.length > 60) return toast.error('Meta title must be 60 characters or fewer');
    if (form.metaDescription.length > 160) return toast.error('Meta description must be 160 characters or fewer');

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        body: form.body,
        coverImageUrl: form.coverImageUrl || undefined,
        tags: form.tags,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        status: form.status,
        publishAt:
          form.status === 'SCHEDULED' && form.publishAt
            ? new Date(form.publishAt).toISOString()
            : undefined,
      };

      const saved = isNew
        ? await adminApi.createBlogPost(payload)
        : await adminApi.updateBlogPost(id, payload);

      toast.success(isNew ? 'Post created' : 'Post updated');
      router.push(`/blog/${saved.id}`);
    } catch {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const referrerEntries = useMemo(
    () => Object.entries(analytics?.referrers || {}).sort((a, b) => b[1] - a[1]),
    [analytics?.referrers],
  );

  const addTag = (rawValue: string) => {
    const clean = rawValue.trim().replace(/^,+|,+$/g, '');
    if (!clean) return;
    setForm((current) => (current.tags.includes(clean) ? current : { ...current, tags: [...current.tags, clean] }));
  };

  const commitTags = () => {
    if (!tagInput.trim()) return;
    tagInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach(addTag);
    setTagInput('');
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Publishing"
        title={isNew ? 'New post' : 'Edit post'}
        description="Write long-form articles, tune SEO fields, and control when each piece goes live."
        actions={(
          <>
            <Link href="/blog" style={adminActionButtonStyle(adminTheme.textMuted)}>
              <ArrowLeft size={14} />
              Back to blog
            </Link>
            <button type="button" onClick={savePost} disabled={saving} style={adminActionButtonStyle(adminTheme.accent)}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Save post'}
            </button>
          </>
        )}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button type="button" onClick={() => setActiveTab('editor')} style={adminActionButtonStyle(activeTab === 'editor' ? adminTheme.accent : adminTheme.textMuted)}>
          Editor
        </button>
        <button type="button" onClick={() => setActiveTab('analytics')} disabled={isNew} style={adminActionButtonStyle(activeTab === 'analytics' ? adminTheme.info : adminTheme.textMuted)}>
          Analytics
        </button>
      </div>

      {loading ? (
        <AdminCard style={{ padding: 28 }}>
          <div style={{ height: 18, width: 220, background: '#111c2e', borderRadius: 4, marginBottom: 18 }} />
          <div style={{ height: 420, width: '100%', background: '#111c2e', borderRadius: 10 }} />
        </AdminCard>
      ) : activeTab === 'analytics' ? (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <AdminMetricCard label="Views (30 days)" value={analyticsLoading ? '...' : analytics?.totalViews ?? 0} accent={adminTheme.accent} />
            <AdminMetricCard label="Unique visitors" value={analyticsLoading ? '...' : analytics?.uniqueVisitors ?? 0} accent={adminTheme.info} />
            <AdminMetricCard label="Average read time" value={analyticsLoading ? '...' : formatAverageReadTime(analytics?.avgReadTimeMs ?? 0)} accent={adminTheme.success} />
          </div>

          <AdminCard style={{ padding: 22 }}>
            <p style={adminTypography.eyebrow}>Top referrers</p>
            <h2 style={{ color: adminTheme.textStrong, fontSize: 20, marginTop: 8 }}>Where readers are coming from</h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              {referrerEntries.length === 0 ? (
                <p style={{ color: adminTheme.textMuted, fontSize: 13 }}>No view data recorded yet.</p>
              ) : (
                referrerEntries.map(([referrer, count]) => (
                  <div key={referrer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ color: adminTheme.textStrong, fontSize: 13 }}>{referrer}</span>
                      <span style={{ color: adminTheme.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{count}</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: '#060c17', overflow: 'hidden', border: `1px solid ${adminTheme.panelInset}` }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(8, (count / Math.max(...referrerEntries.map((entry) => entry[1]), 1)) * 100)}%`,
                          background: 'linear-gradient(90deg, rgba(212,168,83,0.95), rgba(122,179,212,0.85))',
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCard>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)' }}>
          <div>
            <AdminCard style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <ToolbarButton active={editor?.isActive('heading', { level: 2 })} label="H2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
                <ToolbarButton active={editor?.isActive('heading', { level: 3 })} label="H3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
                <ToolbarButton active={editor?.isActive('bold')} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} />
                <ToolbarButton active={editor?.isActive('italic')} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} />
                <ToolbarButton active={editor?.isActive('strike')} label="Strike" onClick={() => editor?.chain().focus().toggleStrike().run()} />
                <ToolbarButton active={editor?.isActive('bulletList')} label="Bullets" onClick={() => editor?.chain().focus().toggleBulletList().run()} />
                <ToolbarButton active={editor?.isActive('orderedList')} label="Numbers" onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
                <ToolbarButton active={editor?.isActive('blockquote')} label="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
                <ToolbarButton active={editor?.isActive('codeBlock')} label="Code" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} />
                <ToolbarButton label="Rule" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
                <ToolbarButton label="Break" onClick={() => editor?.chain().focus().setHardBreak().run()} />
                <ToolbarButton
                  active={editor?.isActive('link')}
                  label="Link"
                  onClick={() => {
                    if (!editor) return;
                    const previousUrl = editor.getAttributes('link').href || '';
                    const url = window.prompt('Link URL', previousUrl);
                    if (url === null) return;
                    if (url === '') return void editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    const openInNewTab = window.confirm('Open this link in a new tab?');
                    editor.chain().focus().extendMarkRange('link').setLink({
                      href: url,
                      target: openInNewTab ? '_blank' : null,
                      rel: openInNewTab ? 'noopener noreferrer' : null,
                    }).run();
                  }}
                />
                <ToolbarButton
                  label="Image"
                  onClick={() => {
                    const url = window.prompt('Image URL');
                    if (!url || !editor) return;
                    editor.chain().focus().setImage({ src: url }).run();
                  }}
                />
              </div>
              <div style={{ border: `1px solid ${adminTheme.panelBorder}`, borderRadius: 10, background: '#060c17' }}>
                <EditorContent editor={editor} />
              </div>
              <p style={{ marginTop: 12, color: adminTheme.textMuted, fontSize: 12 }}>
                Estimated read time: {estimatedReadTime} min
              </p>
            </AdminCard>
          </div>

          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <AdminCard style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Title</FieldLabel>
                <TextInput value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Slug</FieldLabel>
                <TextInput value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: event.target.value })); }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <FieldLabel>Excerpt</FieldLabel>
                  <span style={{ color: adminTheme.textSoft, fontSize: 11 }}>{form.excerpt.length}/300</span>
                </div>
                <textarea value={form.excerpt} maxLength={300} rows={5} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} style={adminTextareaStyle()} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Cover image URL</FieldLabel>
                <TextInput value={form.coverImageUrl} onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Tags</FieldLabel>
                <TextInput
                  value={tagInput}
                  placeholder="Type a tag and press comma or Enter"
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ',') return;
                    event.preventDefault();
                    commitTags();
                  }}
                  onBlur={commitTags}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {form.tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => setForm((current) => ({ ...current, tags: current.tags.filter((value) => value !== tag) }))} style={adminActionButtonStyle(adminTheme.info, true)}>
                      {tag} ×
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <FieldLabel>Meta title</FieldLabel>
                  <span style={{ color: adminTheme.textSoft, fontSize: 11 }}>{form.metaTitle.length}/60</span>
                </div>
                <TextInput value={form.metaTitle} maxLength={60} onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <FieldLabel>Meta description</FieldLabel>
                  <span style={{ color: adminTheme.textSoft, fontSize: 11 }}>{form.metaDescription.length}/160</span>
                </div>
                <textarea value={form.metaDescription} maxLength={160} rows={4} onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))} style={adminTextareaStyle()} />
              </div>
              <div style={{ marginBottom: form.status === 'SCHEDULED' ? 14 : 0 }}>
                <FieldLabel>Status</FieldLabel>
                <AdminSelect value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as BlogFormState['status'] }))} style={{ width: '100%' }}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </AdminSelect>
              </div>
              {form.status === 'SCHEDULED' ? (
                <div style={{ marginTop: 14 }}>
                  <FieldLabel>Publish at</FieldLabel>
                  <TextInput type="datetime-local" value={form.publishAt} onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))} />
                </div>
              ) : null}
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  );
}
