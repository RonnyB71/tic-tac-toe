interface Props {
  value: string | null;
  onClick: () => void;
}

export default function Cell({ value, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{ width: 100, height: 100, fontSize: '2rem', cursor: value ? 'default' : 'pointer' }}
      disabled={!!value}
    >
      {value ?? ''}
    </button>
  );
}
