const SERVICES = [
  {
    title: "Registre des citoyens",
    description:
      "Recensement des habitants de Valentine, état civil et consultation du casier judiciaire.",
  },
  {
    title: "Documents officiels",
    description:
      "Délivrance des actes de propriété, licences de commerce et permis de port d'arme.",
  },
  {
    title: "Arrêtés municipaux",
    description: "Publication des décisions du conseil et affichage légal sur la place du marché.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="font-display text-4xl text-primary">Mairie de Valentine</h1>
        <p className="max-w-2xl text-lg text-muted">
          Bienvenue sur le portail administratif de la ville. Connectez-vous avec Discord pour
          accéder à votre espace et aux services réservés aux agents municipaux.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <article
            key={service.title}
            className="rounded-lg border border-line bg-surface p-6 shadow-sm"
          >
            <h2 className="font-display text-lg text-primary">{service.title}</h2>
            <p className="mt-3 text-sm text-muted">{service.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
