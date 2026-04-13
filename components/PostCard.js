import Link from 'next/link';

function TypeBadge({ type }) {
  if (type === 'VIDEO') {
    return (
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21" />
        </svg>
        Video
      </span>
    );
  }
  if (type === 'CAROUSEL_ALBUM') {
    return (
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-medium">
        ⊞ Album
      </span>
    );
  }
  return null;
}

export default function PostCard({ post }) {
  const thumb = post.thumbnail_url ?? post.media_url;
  const date = new Date(post.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group flex flex-col rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={post.caption ?? 'Post'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            📸
          </div>
        )}
        <TypeBadge type={post.media_type} />
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        {post.caption && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {post.caption}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {(post.like_count ?? 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {(post.comments_count ?? 0).toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
      </div>
    </Link>
  );
}
