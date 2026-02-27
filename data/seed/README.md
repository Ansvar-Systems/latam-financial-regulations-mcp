# Seed Data

This directory contains seed data files for the LATAM Financial Regulations MCP database.

## Structure

Seed data will be organized by country and regulator:

```
data/seed/
  BR/
    bacen/       # BACEN resolucoes, circulares
    cvm/         # CVM instrucoes, deliberacoes
    susep/       # SUSEP circulares, resolucoes
  CL/
    cmf/         # CMF RAN chapters, circulares
  CO/
    sfc/         # SFC circulares externas
  UY/
    bcu/         # BCU circulares, RNRCSF
  MX/
    cnbv/        # CNBV CUB disposiciones
  PE/
    sbs/         # SBS resoluciones
```

## Format

Each regulation is stored as a JSON file with the following structure:

```json
{
  "id": "bacen-res-4893-2021",
  "regulator_id": "BACEN",
  "country_code": "BR",
  "title": "Resolucao CMN 4.893/2021",
  "official_number": "4893",
  "year": 2021,
  "sector": "banking",
  "status": "in_force",
  "source_url": "https://...",
  "provisions": [
    {
      "article_ref": "art-1",
      "title": "Objeto",
      "content": "...",
      "topic": "scope"
    }
  ]
}
```

## Adding Seed Data

1. Create the JSON file in the appropriate country/regulator directory
2. Run `npm run build:db` to rebuild the database
3. Verify with `npm run dev` and test the relevant tools
