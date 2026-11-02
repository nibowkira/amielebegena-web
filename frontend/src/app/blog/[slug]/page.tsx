import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "../../../data/blogPosts";
import { ArrowLeft, ArrowRight, Calendar, BookOpen } from "lucide-react";

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 2);

  // Split content into paragraphs for clean two-column editorial flow
  const paragraphs = post.content
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const midpoint = Math.ceil(paragraphs.length / 2);
  const col1Paragraphs = paragraphs.slice(0, midpoint);
  const col2Paragraphs = paragraphs.slice(midpoint);

  return (
    <div className="w-full min-h-screen bg-[#F4F1EA] py-12 px-4 sm:px-8">
      <article className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <div className="reveal">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#14231b] hover:text-[#2d6a4f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ወደ መጣጥፎች ተመለስ (Back to Knowledge Center)</span>
          </Link>
        </div>

        {/* Main Article Container (Pure White Card matching Screenshot 2) */}
        <div className="reveal bg-white rounded-3xl shadow-xl p-8 sm:p-14 border border-[#14231b]/5 text-[#14231b] space-y-10">
          {/* Header Image in Warm Frame */}
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#EFECE4] border border-[#14231b]/10 shadow-sm flex items-center justify-center">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title & Metadata */}
          <div className="space-y-4 text-center max-w-2xl mx-auto border-b border-[#14231b]/10 pb-8">
            <div className="inline-block px-3 py-1 rounded-full border border-[#d4af37]/40 bg-[#fef9ee] text-[10px] font-extrabold text-[#b8860b] uppercase tracking-wider">
              {post.category}
            </div>

            <h1 className="font-benaiah text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#14231b] leading-snug">
              {post.title}
            </h1>

            <p className="text-xs sm:text-sm text-[#5b615e] leading-relaxed font-light italic">
              {post.subtitle}
            </p>

            <div className="flex items-center justify-center gap-4 text-xs text-[#737874] pt-2">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>{post.date}</span>
              </span>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Editorial Excerpt */}
          <div className="p-6 rounded-2xl bg-[#F9F7F2] border-l-4 border-[#14231b] text-xs sm:text-sm text-[#14231b] leading-relaxed font-benaiah font-medium">
            "{post.excerpt}"
          </div>

          {/* Two-Column Editorial Layout matching Screenshot 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-[#2b3a32] leading-relaxed font-light">
            {/* Column 1 */}
            <div className="space-y-6">
              {col1Paragraphs.map((para, i) => {
                if (para.startsWith("### ")) {
                  return (
                    <h3
                      key={i}
                      className="font-benaiah text-lg font-bold text-[#14231b] pt-2 border-b border-[#14231b]/10 pb-1"
                    >
                      {para.replace("### ", "")}
                    </h3>
                  );
                }
                return (
                  <p key={i} className="leading-relaxed font-light">
                    {para}
                  </p>
                );
              })}
            </div>

            {/* Column 2 */}
            <div className="space-y-6 md:border-l md:border-[#14231b]/10 md:pl-8">
              {col2Paragraphs.map((para, i) => {
                if (para.startsWith("### ")) {
                  return (
                    <h3
                      key={i}
                      className="font-benaiah text-lg font-bold text-[#14231b] pt-2 border-b border-[#14231b]/10 pb-1"
                    >
                      {para.replace("### ", "")}
                    </h3>
                  );
                }
                return (
                  <p key={i} className="leading-relaxed font-light">
                    {para}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Related Articles */}
          <div className="pt-10 border-t border-[#14231b]/10 space-y-6">
            <h3 className="font-benaiah text-xl font-bold text-[#14231b]">
              ተዛማጅ መጣጥፎች (Related Guides)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="p-5 rounded-2xl border border-[#14231b]/10 bg-[#FAF8F5] hover:bg-[#F2EFE8] transition-all flex flex-col justify-between space-y-2 group"
                >
                  <span className="text-[10px] text-[#b8860b] uppercase font-bold tracking-wider">
                    {r.category}
                  </span>
                  <h4 className="font-benaiah text-sm font-bold text-[#14231b] group-hover:text-[#2d6a4f] transition-colors line-clamp-2">
                    {r.title}
                  </h4>
                  <div className="text-[11px] text-[#14231b] flex items-center gap-1 font-bold pt-1">
                    <span>Read Article</span> <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
