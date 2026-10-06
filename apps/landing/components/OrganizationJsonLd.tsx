const SITE = "https://www.pyxis-latam.cl";

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pyxis",
  url: SITE,
  logo: `${SITE}/icon`,
  email: "equipo@pyxis-latam.cl",
  description:
    "Pyxis Labs recompone empresas medianas: procesos, equipo comercial e integraciones con el ERP que ya tienen. Pyxis Ventures construye empresas que operan sin personas. Hermes, distribuidora de insumos de oficina, es la primera.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Santiago",
    addressCountry: "CL",
  },
  founder: [
    {
      "@type": "Person",
      name: "Vicente Pareja",
      jobTitle: "Chief Executive Officer",
      sameAs: "https://www.linkedin.com/in/vicentepareja/",
    },
    {
      "@type": "Person",
      name: "Felipe Carvallo Lancellotti",
      jobTitle: "Chief Deployment Officer",
      sameAs: "https://www.linkedin.com/in/felipe-carvallo-lancellotti-228615276/",
    },
  ],
  subOrganization: [
    { "@type": "Organization", name: "Pyxis Labs", parentOrganization: { "@type": "Organization", name: "Pyxis" } },
    { "@type": "Organization", name: "Pyxis Ventures", parentOrganization: { "@type": "Organization", name: "Pyxis" } },
  ],
};

export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
    />
  );
}
