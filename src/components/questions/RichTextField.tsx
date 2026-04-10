import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
}

type Props = {
  label?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextField({ label, value, onChange, placeholder }: Props) {
  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-sm font-medium text-[var(--text)]">{label}</label>
      ) : null}
      <div className="neet-quill rounded-xl border border-[var(--border)] bg-[var(--card)] [&_.ql-editor]:min-h-[120px] [&_.ql-toolbar]:rounded-t-xl [&_.ql-container]:rounded-b-xl">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}
