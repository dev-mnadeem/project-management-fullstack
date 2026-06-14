// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectForm, EMPTY_PROJECT_FORM, type ProjectFormValues } from '@/components/project/ProjectForm';
import { TaskForm, EMPTY_TASK_FORM, splitPhotoUrls, type TaskFormValues } from '@/components/task/TaskForm';

function ControlledProjectForm({ onSubmit }: { onSubmit: (values: ProjectFormValues) => void }) {
  const [values, setValues] = React.useState(EMPTY_PROJECT_FORM);
  return (
    <ProjectForm
      values={values}
      onChange={setValues}
      onSubmit={() => onSubmit(values)}
      onCancel={vi.fn()}
      submitLabel="Create project"
    />
  );
}

function ControlledTaskForm({ onSubmit }: { onSubmit: (values: TaskFormValues) => void }) {
  const [values, setValues] = React.useState(EMPTY_TASK_FORM);
  return (
    <TaskForm values={values} onChange={setValues} onSubmit={() => onSubmit(values)} submitLabel="Create task" />
  );
}

describe('ProjectForm', () => {
  it('labels every control, so each input is reachable by its name', () => {
    render(<ControlledProjectForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Deadline')).toBeInTheDocument();
  });

  it('reports the edited values on submit', async () => {
    const onSubmit = vi.fn();
    render(<ControlledProjectForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Portal rebuild');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'On Hold');
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Portal rebuild', status: 'On Hold' }),
    );
  });

  it('offers exactly the three project statuses', () => {
    render(<ControlledProjectForm onSubmit={vi.fn()} />);
    const options = screen.getByLabelText('Status').querySelectorAll('option');
    expect([...options].map((option) => option.textContent)).toEqual(['Active', 'On Hold', 'Completed']);
  });

  it('renders a submission error as an alert', () => {
    render(
      <ProjectForm
        values={EMPTY_PROJECT_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="Save"
        error="Title is required"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
  });

  it('disables the submit button while a save is in flight', () => {
    render(
      <ProjectForm
        values={EMPTY_PROJECT_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="Save"
        pending
      />,
    );
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('cancelling does not submit the form', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <ProjectForm
        values={EMPTY_PROJECT_FORM}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Save"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('TaskForm', () => {
  it('offers the task statuses and priorities from the domain registries', () => {
    render(<ControlledTaskForm onSubmit={vi.fn()} />);
    const statuses = [...screen.getByLabelText('Status').querySelectorAll('option')].map((o) => o.textContent);
    const priorities = [...screen.getByLabelText('Priority').querySelectorAll('option')].map((o) => o.textContent);
    expect(statuses).toEqual(['Todo', 'In Progress', 'Done']);
    expect(priorities).toEqual(['Low', 'Medium', 'High']);
  });

  it('reports the edited values on submit', async () => {
    const onSubmit = vi.fn();
    render(<ControlledTaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Write the migration');
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'High');
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Write the migration', priority: 'High' }),
    );
  });
});

describe('splitPhotoUrls', () => {
  it('splits, trims and drops the empty entries', () => {
    expect(splitPhotoUrls(' https://a.test/1.png , ,https://b.test/2.png ')).toEqual([
      'https://a.test/1.png',
      'https://b.test/2.png',
    ]);
  });

  it('returns an empty array for an empty field', () => {
    expect(splitPhotoUrls('')).toEqual([]);
    expect(splitPhotoUrls('  ,  ')).toEqual([]);
  });
});
