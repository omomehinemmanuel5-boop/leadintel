import { NextResponse } from 'next/server';
import axios from 'axios';

// =========================================================================
// 1. ARCHITECTURE INTERFACES & TARGETING MATRIX
// =========================================================================
interface TargetMatrix {
  countries: Record<string, string[]>;
  industries: string[];
  roles: string[];
}

export interface DiscoveredLead {
  companyName: string;
  domain: string;
  executiveName: string;
  role: string;
  predictedEmail: string;
  region: string;
  industry: string;
  sourceUrl: string;
}

const TARGET_MATRIX: TargetMatrix = {
  countries: {
    USA: ['Austin', 'Charlotte', 'Columbus', 'Indianapolis', 'Phoenix', 'Salt Lake City'],
    Canada: ['Calgary', 'Edmonton', 'Halifax', 'Ottawa', 'Winnipeg', 'Mississauga'],
    Germany: ['Stuttgart', 'Düsseldorf', 'Leipzig', 'Nuremberg', 'Bremen', 'Hannover'],
    Australia: ['Adelaide', 'Perth', 'Brisbane', 'Geelong', 'Newcastle', 'Gold Coast']
  },
  industries: [
    'Precision Manufacturing',
    'Commercial HVAC and Logistics',
    'B2B SaaS and Cloud Architecture',
    'Medical Device Distributing',
    'Renewable Energy Contracting',
    'B2B Freight Forwarding',
    'Corporate IT Consulting',
    'Chemical Processing & Logistics'
  ],
  roles: ['CEO', 'Chief Executive Officer', 'Founder & CEO', 'Managing Director', 'Geschäftsführer']
};

// =========================================================================
// 2. LEADINTEL DISCOVERY ENGINE CLASS
// =========================================================================
class LeadIntelDiscoveryEngine {
  private searchApiKey: string;

  constructor(searchApiKey: string) {
    this.searchApiKey = searchApiKey;
  }

  public generateQueries(country: string): string[] {
    const cities = TARGET_MATRIX.countries[country] || [];
    const queries: string[] = [];

    for (const city of cities) {
      for (const industry of TARGET_MATRIX.industries) {
        for (const role of TARGET_MATRIX.roles) {
          const tld = country.toLowerCase() === 'usa' ? 'com' : country.toLowerCase();
          queries.push(`"${role}" "${industry}" site:.com.${tld} "${city}"`);
          queries.push(`"${role} of" "${industry}" ${city} "about us"`);
        }
      }
    }
    return queries;
  }

  private async executeSearchQuery(query: string): Promise<any[]> {
    try {
      const response = await axios.post(
        'https://google.serper.dev/search',
        { q: query, num: 20 },
        {
          headers: {
            'X-API-KEY': this.searchApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.organic || [];
    } catch (error) {
      console.error(`Search engine failure on [${query}]:`, error);
      return [];
    }
  }

  public deriveCorporateEmail(fullName: string, domain: string): string {
    const cleanName = fullName.toLowerCase().replace(/[^a-z\s]/g, '');
    const parts = cleanName.split(' ');
    
    if (parts.length < 2) return `info@${domain}`;

    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first}.${last}@${domain}`;
  }

  public async runDiscoveryPipeline(country: string, limit: number = 5): Promise<DiscoveredLead[]> {
    const queries = this.generateQueries(country).slice(0, limit);
    const compiledLeads: DiscoveredLead[] = [];

    for (const query of queries) {
      // Fixed: Properly targeting internal class method
      const searchResults = await this.executeSearchQuery(query);

      for (const result of searchResults) {
        const url = result.link;
        if (!url) continue;

        try {
          const domain = new URL(url).hostname.replace('www.', '');
          const snippet = result.snippet || '';
          const title = result.title || '';
          
          let executiveName = '';
          let matchedRole = 'CEO';

          for (const role of TARGET_MATRIX.roles) {
            if (snippet.includes(role) || title.includes(role)) {
              matchedRole = role;
              const nameExtractionRegex = new RegExp(`(?:${role})\\s*(?:of|is|,)?\\s*([A-Z][a-z]+\\s[A-Z][a-z]+)`);
              const found = snippet.match(nameExtractionRegex) || title.match(nameExtractionRegex);
              if (found && found[1]) {
                executiveName = found[1];
                break;
              }
            }
          }

          if (!executiveName || compiledLeads.some(lead => lead.domain === domain)) {
            continue;
          }

          compiledLeads.push({
            companyName: title.split('|')[0].split('-')[0].trim(),
            domain,
            executiveName,
            role: matchedRole,
            predictedEmail: this.deriveCorporateEmail(executiveName, domain),
            region: country,
            industry: query,
            sourceUrl: url
          });

        } catch {
          continue; 
        }
      }
    }

    return compiledLeads;
  }
}

// =========================================================================
// 3. NEXT.JS APP ROUTER POST METHOD HANDLER
// =========================================================================
export async function POST(request: Request) {
  try {
    const { country, limit } = await request.json();
    
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'System Configuration Fault: Missing SERPER_API_KEY environment token.' }, 
        { status: 500 }
      );
    }

    if (!country) {
      return NextResponse.json(
        { error: 'Bad Request: Target country parameter is mandatory.' }, 
        { status: 400 }
      );
    }

    const engine = new LeadIntelDiscoveryEngine(apiKey);
    const data = await engine.runDiscoveryPipeline(country, limit || 5);

    return NextResponse.json({
      success: true,
      count: data.length,
      timestamp: new Date().toISOString(),
      data: data
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Pipeline Execution Failure', details: error.message }, 
      { status: 500 }
    );
  }
}
