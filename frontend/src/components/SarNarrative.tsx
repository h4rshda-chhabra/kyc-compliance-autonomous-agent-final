import ReactMarkdown from 'react-markdown';
import styles from './SarNarrative.module.css';

interface SarNarrativeProps {
  content: string;
}

export function SarNarrative({ content }: SarNarrativeProps) {
  return (
    <div className={styles.narrative}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className={styles.h1} {...props} />,
          h2: ({ node, ...props }) => <h2 className={styles.h2} {...props} />,
          h3: ({ node, ...props }) => <h3 className={styles.h3} {...props} />,
          p: ({ node, ...props }) => <p className={styles.paragraph} {...props} />,
          ul: ({ node, ...props }) => <ul className={styles.list} {...props} />,
          ol: ({ node, ...props }) => <ol className={styles.orderedList} {...props} />,
          li: ({ node, ...props }) => <li className={styles.listItem} {...props} />,
          strong: ({ node, ...props }) => <strong className={styles.bold} {...props} />,
          em: ({ node, ...props }) => <em className={styles.italic} {...props} />,
          table: ({ node, ...props }) => <table className={styles.table} {...props} />,
          th: ({ node, ...props }) => <th className={styles.th} {...props} />,
          td: ({ node, ...props }) => <td className={styles.td} {...props} />,
          thead: ({ node, ...props }) => <thead className={styles.thead} {...props} />,
          tbody: ({ node, ...props }) => <tbody className={styles.tbody} {...props} />,
          tr: ({ node, ...props }) => <tr className={styles.tr} {...props} />,
          hr: ({ node, ...props }) => <hr className={styles.hr} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
