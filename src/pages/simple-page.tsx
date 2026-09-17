type SimplePageProps = {
    title: string;
    description: string;
  };
  
  export function SimplePage({
    title,
    description,
  }: SimplePageProps) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
  
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
  
        <div className="mt-6 min-h-80 rounded-lg border bg-card p-6">
          화면 내용 영역
        </div>
      </section>
    );
  }