'use client';

import { useMemo } from 'react';
import { dockTopic, lessonCtxOf } from '@/lib/dock/protocol';
import { DockChannelProvider, useDock } from './DockChannel';
import { DockBoundary } from './DockBoundary';
import { ClassDock } from './ClassDock';

/** Док викладача: розмова з одним учнем на /teacher/students/[id] і /watch */
export function TeacherDock({
  studentId,
  name,
  defaultOpen,
  initialFilterLesson,
}: {
  studentId: string;
  name: string;
  defaultOpen?: boolean;
  initialFilterLesson?: string;
}) {
  return (
    <DockBoundary>
      <DockChannelProvider topic={dockTopic(studentId)} presence={null}>
        <Inner studentId={studentId} name={name} defaultOpen={defaultOpen} initialFilterLesson={initialFilterLesson} />
      </DockChannelProvider>
    </DockBoundary>
  );
}

function Inner({ studentId, name, defaultOpen, initialFilterLesson }: { studentId: string; name: string; defaultOpen?: boolean; initialFilterLesson?: string }) {
  const { peers } = useDock();
  // лекція, у якій зараз учень: беремо вкладку, що в лекції, найсвіжішу
  const lesson = useMemo(() => {
    const stu = peers.filter((p) => p.role === 'student').sort((a, b) => b.at - a.at);
    const inLesson = stu.find((p) => lessonCtxOf(p).slug);
    const c = inLesson ? lessonCtxOf(inLesson) : null;
    return c?.slug ? { slug: c.slug, pg: c.pg } : null;
  }, [peers]);
  return (
    <ClassDock
      role="teacher"
      studentId={studentId}
      studentName={name}
      lesson={lesson}
      defaultOpen={defaultOpen}
      initialFilterLesson={initialFilterLesson}
      studentOnline={peers.some((p) => p.role === 'student')}
    />
  );
}
