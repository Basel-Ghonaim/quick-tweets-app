import { AUTH_COPY } from "@shared/copy";
import styles from "./FeedTexture.module.css";

/** Texture, not content: blurred past reading, announced to nobody, and behind
 *  a scrim so nothing here competes with the text in front of it. */
export const FeedTexture = () => (
  <>
    <div className={styles.field} data-testid="feed-texture">
      {AUTH_COPY.backdropPosts.map((post) => (
        <article key={post.handle} className={styles.card}>
          <div className={styles.head}>
            <span className={styles.avatar} />
            <span className={styles.name}>{post.name}</span>
            <span className={styles.meta}>
              {post.handle} · {post.age}
            </span>
          </div>
          <p className={styles.body}>{post.body}</p>
        </article>
      ))}
    </div>
    <div className={styles.scrim} />
  </>
);
