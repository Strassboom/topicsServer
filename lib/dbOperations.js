// const duplicateMap = require('../lib/duplicateMap.json');
const Promise = require('bluebird');

// TODO: The whole file needs unit testing. Once we add unit testing here, we should re-work the error handling section of sendIndividualRecords, but currently
// I am too worried about breaking functionality for TIBA to optimize this comfortably.

async function sendData({ data, model }) {
  for (let key in data) {
    try {
      // This works because model is a function. Model.name is a function prototype that pulls name of func as a string.
      // The name of the model function is what we key the duplicateMap on.
      const insertResults = await model.bulkCreate(data);
      return {
        success: true,
        recordsUpdated: insertResults.length
      }
    } catch (error) {
      if (error.original.code == 21000 || error.original.code == 23505) {
        const individualResults = await sendIndividualRecords({ records: finalData, model });
        return individualResults;
      }
      return {
        success: false,
        error: error
      }
    }
  }
}

async function sendIndividualRecords({ records, model }) {
  // logger.info(`Starting sendIndividualRecords for table ${model.name} due to duplicate records detected inside the chunk.`);
  // model.upsert does not work as I thought it would in this situation. It does not 
  await Promise.mapSeries(records, async (record, index) => {
    try {
      console.log(record);
      console.log(index);
      // const insertResults = await model.upsert(record, { fields: duplicateMap[model.name]});
      const insertResults = await model.bulkCreate([ record ], { updateOnDuplicate: duplicateMap[model.name]});
      console.log(insertResults);
      console.log(`----`)
      return {
        success: true
      }
    } catch (error) {
      // console.log(`${error.code} - ${error.detail} - ${error.table}`);
      console.log(error);
      // throw new Error(error);
    }
  }).catch((error) => {
    console.log(error);
    console.log('ERROR CAUGHT!!!!!!!!!!!!!!!');
    
    return { success: false, error };
  });
  return { success: true };
}

async function updateData(data){
  var sequelizeModels = require('topics-models')(sequelizeInstance);
  sequelizeModels[modelName].bulkInsert(data,{updateOnDuplicate: true});
  sequelizeInstance.close();
}

async function wipeDataByLocationIdAndModel({ model }) {

  if (!model) {
    throw new Error('model is required for wipeDataByLocationIdAndTable.');
  }
  const numDestroyed = await model.destroy({
    where: {
    }
  });
  return { success: true, model, numDestroyed };
}

function addLocIds({ data, locationId }) {
  return data.map((record) => {
    record.location_id = Number(locationId);
    return record;
  })
}

module.exports = {
  sendData,
  updateData,
  wipeDataByLocationIdAndModel
}
