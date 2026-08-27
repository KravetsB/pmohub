import React from "react";
import { OperationalTask, Quarter } from "../../../shared/types";
import { InitiativeCardModal } from "../../initiatives/components/InitiativeCardModal";

interface Props {
  task: OperationalTask | null;
  onClose: () => void;
  onSave: (task: OperationalTask) => void;
  isReadOnly?: boolean;
  onDelete?: (id: string) => void;
  defaultYear?: number;
  defaultQuarter?: Quarter;
  defaultIsBacklog?: boolean;
}

export const TaskModal = (props: Props) => (
  <InitiativeCardModal
    kind="task"
    item={props.task}
    onClose={props.onClose}
    onSave={(item) => props.onSave(item as OperationalTask)}
    onDelete={props.onDelete}
    isReadOnly={props.isReadOnly}
    defaultYear={props.defaultYear}
    defaultQuarter={props.defaultQuarter}
  />
);
