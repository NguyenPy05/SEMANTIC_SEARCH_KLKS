import { motion } from "framer-motion";

interface Props {
  count?: number;
}

export function ResultCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 rounded-lg skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/3" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-14 h-12 skeleton rounded-lg" />
          <div className="w-14 h-12 skeleton rounded-lg" />
        </div>
      </div>
      <div className="score-bar skeleton" />
      <div className="flex gap-2">
        <div className="h-5 w-20 skeleton rounded-full" />
        <div className="h-5 w-16 skeleton rounded-full" />
        <div className="h-5 w-24 skeleton rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 skeleton rounded w-full" />
        <div className="h-3 skeleton rounded w-5/6" />
        <div className="h-3 skeleton rounded w-4/6" />
      </div>
    </div>
  );
}

export default function SkeletonList({ count = 5 }: Props) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08 }}
        >
          <ResultCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
