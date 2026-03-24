import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = '6px', className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

export function WarrantyCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={14} />
      </div>
      <Skeleton width={72} height={24} borderRadius="12px" />
    </div>
  );
}
