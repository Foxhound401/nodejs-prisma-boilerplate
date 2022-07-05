class TestBedController {
  soxboxDataCrawling = async (req, res) => {
    try {
      console.log("call to database")
    } catch (err) {
      console.error(err)
      return err
    }
  }

  sunsystemSumulation = async (req, res) => {
    try {
      console.log("call to simulation")
    } catch (err) {
      console.error(err)
      return err
    }
  }
}

module.exports = TestBedController;
