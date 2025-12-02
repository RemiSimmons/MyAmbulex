import { storage } from "../storage";

export async function initializePlatformSettings() {
  try {
    console.log('Initializing platform settings...');
    
    // Check if platform fee percentage setting exists
    const existingFee = await storage.getPlatformSetting('platform_fee_percentage');
    
    if (!existingFee) {
      // Create default platform fee setting
      await storage.setPlatformSetting({
        key: 'platform_fee_percentage',
        value: '5',
        description: 'Percentage fee taken from driver earnings (0-100)',
        dataType: 'number',
        category: 'financial',
        isEditable: true
      });
      console.log('Default platform fee percentage (5%) initialized');
    } else {
      console.log('Platform fee percentage setting already exists:', existingFee.value + '%');
    }
    
    // Check if base fare setting exists
    const existingBaseFare = await storage.getPlatformSetting('base_fare');
    
    if (!existingBaseFare) {
      await storage.setPlatformSetting({
        key: 'base_fare',
        value: '45',
        description: 'Base fare for all rides in USD',
        dataType: 'number',
        category: 'financial',
        isEditable: true
      });
      console.log('Default base fare ($45) initialized');
    } else {
      console.log('Base fare setting already exists: $' + existingBaseFare.value);
    }
    
    // Check if distance rate setting exists
    const existingDistanceRate = await storage.getPlatformSetting('distance_rate');
    
    if (!existingDistanceRate) {
      await storage.setPlatformSetting({
        key: 'distance_rate',
        value: '2.50',
        description: 'Rate per mile in USD',
        dataType: 'number',
        category: 'financial',
        isEditable: true
      });
      console.log('Default distance rate ($2.50/mile) initialized');
    } else {
      console.log('Distance rate setting already exists: $' + existingDistanceRate.value + '/mile');
    }
    
    console.log('Platform settings initialization completed successfully');
  } catch (error) {
    console.error('Error initializing platform settings:', error);
    throw error;
  }
}