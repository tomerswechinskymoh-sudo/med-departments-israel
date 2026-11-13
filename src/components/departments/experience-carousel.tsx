"use client";

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { experienceQuotes, filterExperienceQuotes, wrapQuoteIndex, type ExperienceQuote, type QuoteReview } from '@/lib/experience-carousel';
import type { PublicSurveyExperience } from '@/lib/staz-survey/domain';
import { reviewerTypeLabel } from '@/lib/query-labels';
import { RatingStars } from '@/components/ui/rating-stars';
import { ReportReviewButton } from './report-review-button';

function QuoteCard({ quote, canReport }: { quote: ExperienceQuote; canReport: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const quoteId = useId();
  const long = quote.parts.reduce((sum, part) => sum + part.text.length, 0) > 420 || quote.parts.reduce((sum, part) => sum + part.text.split('\n').length, 0) > 6;
  return <article className="experience-quote" data-experience-quote={quote.id}>
    <header className="experience-quote-meta">
      <div><span className="experience-quote-year">{quote.year ?? 'לא צוינה שנה'}</span><span aria-hidden="true">·</span><span>{reviewerTypeLabel(quote.role)}</span><span aria-hidden="true">·</span><span>{quote.author ?? 'בעילום שם'}</span></div>
      {quote.rating === null ? <span>ללא דירוג</span> : <RatingStars value={quote.rating} />}
    </header>
    {quote.hospitalScope && <p className="experience-quote-scope">תגובה על כלל בית החולים</p>}
    <div id={quoteId} className={`experience-quote-body${long && !expanded ? ' experience-quote-body--collapsed' : ''}`}>
      <span aria-hidden="true" className="experience-quote-mark">“</span>
      {quote.parts.map((part, index) => <div key={index} className="experience-quote-part">
        {part.label && (quote.parts.length > 1 || part.label !== 'מה עבד טוב') && <p className="experience-quote-part-label">{part.label}</p>}
        <blockquote>{part.text}</blockquote>
      </div>)}
    </div>
    {long && <button type="button" className="experience-read-more" aria-expanded={expanded} aria-controls={quoteId} onClick={() => setExpanded(value => !value)}>{expanded ? 'הצג פחות' : 'המשך קריאה'}</button>}
    {quote.otherRatings.length > 0 && <details className="experience-extra-ratings"><summary>דירוגים נוספים בחוויה</summary><div>{quote.otherRatings.map(rating => <div key={rating.label}><span>{rating.label}</span><RatingStars value={rating.value} /></div>)}</div></details>}
    {canReport && quote.nativeReviewId && <ReportReviewButton reviewId={quote.nativeReviewId} />}
  </article>;
}

function QuoteViewport({ quotes, canReport }: { quotes: ExperienceQuote[]; canReport: boolean }) {
  const [index, setIndex] = useState(0);
  const active = wrapQuoteIndex(index, quotes.length), slideId = useId();
  const move = (direction: number) => setIndex(value => wrapQuoteIndex(value + direction, quotes.length));
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).closest('[data-carousel-navigation]')) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') setIndex(0);
    else if (event.key === 'End') setIndex(quotes.length - 1);
    else move(event.key === 'ArrowLeft' ? 1 : -1);
  }
  return <div className="experience-carousel" role="region" aria-roledescription="קרוסלה" aria-label="תגובות מהמחלקה" tabIndex={0} onKeyDown={onKeyDown}>
    <div id={slideId} aria-live="polite" aria-atomic="false">
      <div role="group" aria-roledescription="תגובה" aria-label={`תגובה ${active + 1} מתוך ${quotes.length}`}>
        <QuoteCard key={quotes[active].id} quote={quotes[active]} canReport={canReport} />
      </div>
    </div>
    <nav className="experience-carousel-navigation" aria-label="מעבר בין תגובות" data-carousel-navigation>
      <button type="button" aria-label="התגובה הקודמת" aria-controls={slideId} disabled={quotes.length < 2} onClick={() => move(-1)}><span aria-hidden="true">→</span><span>הקודמת</span></button>
      <span className="experience-carousel-position">{active + 1} מתוך {quotes.length}</span>
      <button type="button" aria-label="התגובה הבאה" aria-controls={slideId} disabled={quotes.length < 2} onClick={() => move(1)}><span>הבאה</span><span aria-hidden="true">←</span></button>
    </nav>
  </div>;
}

export function ExperienceCarousel({ reviews, surveyExperiences, canReport }: { reviews: QuoteReview[]; surveyExperiences: PublicSurveyExperience[]; canReport: boolean }) {
  const [rating, setRating] = useState('all');
  const selectId = useId();
  const quotes = useMemo(() => experienceQuotes(reviews, surveyExperiences), [reviews, surveyExperiences]);
  const filtered = filterExperienceQuotes(quotes, rating);
  const ratingValues = [...new Set([1, 2, 3, 4, 5, ...quotes.flatMap(quote => quote.rating === null ? [] : [quote.rating])])].sort((a, b) => b - a);
  if (!quotes.length) return <p className="experience-carousel-empty">יש דירוגים בקטגוריה זו, אך עדיין אין תגובות טקסט.</p>;
  return <div className="experience-carousel-section">
    <div className="experience-carousel-filter">
      <label htmlFor={selectId}>סינון לפי דירוג</label>
      <select id={selectId} value={rating} onChange={event => setRating(event.target.value)}>
        <option value="all">כל הדירוגים</option>
        {ratingValues.map(value => <option key={value} value={String(value)}>{value} מתוך 5</option>)}
        <option value="unrated">ללא דירוג</option>
      </select>
      <span>{filtered.length} תגובות</span>
    </div>
    {filtered.length ? <QuoteViewport key={rating} quotes={filtered} canReport={canReport} /> : <div className="experience-carousel-empty" role="status"><p>אין תגובות בדירוג שבחרת.</p><button type="button" onClick={() => setRating('all')}>הצגת כל התגובות</button></div>}
  </div>;
}
