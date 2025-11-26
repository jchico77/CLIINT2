import { VendorService } from '../src/domain/services/vendorService';
import { ClientService } from '../src/domain/services/clientService';
import { ServiceOfferingService } from '../src/domain/services/serviceOfferingService';
import { OpportunityService } from '../src/domain/services/opportunityService';
import { OpportunityDossierService } from '../src/domain/services/opportunityDossierService';

async function runDemo() {
  const vendor = VendorService.create({
    name: 'Demo Vendor',
    websiteUrl: 'https://vendor.demo',
    description: 'Vendor creado para probar OpportunityDossier',
  });

  const client = ClientService.create({
    vendorId: vendor.id,
    name: 'Cliente Demo',
    websiteUrl: 'https://client.demo',
  });

  const service = ServiceOfferingService.create({
    vendorId: vendor.id,
    name: 'Servicio Demo',
    shortDescription: 'Servicio utilizado en el script de demo',
    categoryTags: ['demo'],
  });

  const opportunity = OpportunityService.createOpportunity({
    vendorId: vendor.id,
    clientId: client.id,
    serviceOfferingId: service.id,
    name: 'Oportunidad Demo',
    notes: 'Notas iniciales de la oportunidad.',
  });

  OpportunityDossierService.appendTextChunk(opportunity.id, {
    sourceType: 'email',
    title: 'Email cliente',
    content: 'El cliente solicita un briefing el próximo lunes.',
  });

  OpportunityDossierService.attachFileId(opportunity.id, 'file-prod-demo-001');

  const dossier = OpportunityDossierService.getDossier(opportunity.id);

  console.log('\n=== Opportunity Dossier Demo ===');
  console.log('Opportunity:', opportunity.id);
  console.log('Text chunks:', dossier.textChunks);
  console.log('OpenAI file ids:', dossier.openAiFileIds);
  console.log('===============================\n');
}

runDemo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});


