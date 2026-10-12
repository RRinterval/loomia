import { Fragment } from "react";

// 抓 http(s):// 或 www. 開頭的網址，遇到空白、中文字或全形標點就結束（中文常緊接在網址後面）
const URL_PATTERN =
  /(https?:\/\/[^\s<>"'　-〿㐀-鿿＀-￯]+|www\.[^\s<>"'　-〿㐀-鿿＀-￯]+)/gi;
// 網址尾端常黏著的中英文標點，不算進連結
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"」』）】。，、；：！？]+$/;

/** 把文字中的網址變成可點擊、另開新分頁的連結；其餘文字原樣輸出（保留換行由外層 CSS 處理）。 */
export function Linkify({
  text,
  linkClassName = "text-brand underline underline-offset-2 hover:text-brand-dark",
}: {
  text: string;
  linkClassName?: string;
}) {
  const parts = text.split(URL_PATTERN);

  return parts.map((part, i) => {
    // split 搭配捕獲群組時，奇數索引是網址
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

    const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    const href = url.startsWith("www.") ? `https://${url}` : url;

    return (
      <Fragment key={i}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`break-all ${linkClassName}`}
        >
          {url}
        </a>
        {trailing}
      </Fragment>
    );
  });
}
