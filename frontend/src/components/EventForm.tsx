import React from 'react';
import { CreateEventModal } from './CreateEventModal';

export interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'info' | 'maps';
  mode?: 'edit' | 'create';
}

/**
 * EventForm component - Form/Modal tạo và chỉnh sửa sự kiện với validation chặn ngày trong quá khứ.
 */
export const EventForm: React.FC<EventFormProps> = (props) => {
  return <CreateEventModal {...props} />;
};

export default EventForm;
