import styles from './Card.module.css';

export default function Card({ children, className = '', hoverable = false, ...props }) {
  return (
    <section className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
