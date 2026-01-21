import React from 'react';
import FamilyTreeAdvanced from '../components/FamilyTreeAdvanced';
import ErrorBoundary from '../components/ErrorBoundary';

export default function FamilyTree() {
  return (
    <ErrorBoundary fallbackMessage="حدث خطأ أثناء عرض شجرة العائلة. قد يكون السبب بيانات غير صحيحة. يرجى المحاولة مرة أخرى.">
      <FamilyTreeAdvanced />
    </ErrorBoundary>
  );
}
