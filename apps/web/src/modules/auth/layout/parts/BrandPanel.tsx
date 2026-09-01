import { Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import styles from "./BrandPanel.module.css";

/**
 * What the reader is signing in to.
 *
 * **Inert by contract, not by accident.** It holds no field, no button and no
 * link, which is what makes reading and focus order reach the form first at
 * every viewport without anything to maintain.
 *
 * The sample posts are pictures of posts rather than posts: they are announced
 * to nobody and they compose no product component, because a component shaped
 * by a decorative instance would carry that instance's assumptions into the
 * feed that has to live with it.
 */
export const BrandPanel = () => (
  <section className={styles.root}>
    <h1 className={styles.headline}>
      <span className={styles.headlineLine}>{AUTH_COPY.brand.headlineLine1}</span>
      <span className={styles.headlineAccent}>{AUTH_COPY.brand.headlineLine2}</span>
    </h1>

    <Typography variant="body-large" tone="secondary" className={styles.tagline}>
      {AUTH_COPY.brand.tagline}
    </Typography>

    <div className={styles.posts} aria-hidden="true">
      {AUTH_COPY.samplePosts.map((post) => (
        <article key={post.handle} className={styles.post}>
          <div className={styles.postHead}>
            <span className={styles.postAvatar}>{initials(post.name)}</span>
            <span className={styles.postName}>{post.name}</span>
            <span className={styles.postMeta}>
              {post.handle} · {post.age}
            </span>
          </div>
          <p className={styles.postBody}>{post.body}</p>
        </article>
      ))}
    </div>
  </section>
);

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");
