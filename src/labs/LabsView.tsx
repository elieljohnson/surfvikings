// Labs — resolves /labs/:slug to one experiment, lazily.

import React, { Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { LabsLayout } from './LabsLayout';
import { experimentBySlug } from './registry';
import { VizStatus } from './vizKit';

export function LabsView() {
  const { slug } = useParams<{ slug: string }>();
  const exp = slug ? experimentBySlug(slug) : undefined;
  if (!exp) return <Navigate to="/labs" replace />;
  const View = exp.Component;
  return (
    <LabsLayout title={exp.title}>
      <Suspense fallback={<VizStatus kind="loading" message="Loading experiment…" />}>
        <View />
      </Suspense>
    </LabsLayout>
  );
}

export default LabsView;
