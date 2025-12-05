import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
    tasks: Task[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
}

function CalendarSlot({ hour, children }: { hour: number; children?: React.ReactNode }) {
    <TaskCard task={task} onFocus={onFocus} onEdit={onEdit} />
                                    </div >
                                );
})}
                        </CalendarSlot >
                    );
                })}
            </div >
        </div >
    );
}
